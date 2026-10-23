import apiClient from '../apiClient';
import type { AxiosResponse } from 'axios';

// Employee Document interfaces
export interface EmployeeDocument {
  ignoreExpiration: boolean;
  _id: string;
  employee: string;
  documentType: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  status: 'valid' | 'expired' | 'pending' | 'rejected';
  description?: string;
  uploadedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  verifiedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  verifiedAt?: string;
  rejectionReason?: string;
  company: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeWithDocuments {
  employee: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    country: string;
    state: string;
    city: string;
    role: string;
    status: string;
    joinDate: string;
    internalId: string;
    location?: {
      address: string;
      latitude: string;
      longitude: string;
    };
    company: string;
  };
  documents: EmployeeDocument[];
}

export interface DocumentStats {
  totalDocuments: number;
  validDocuments: number;
  expiredDocuments: number;
  pendingDocuments: number;
  rejectedDocuments: number;
  expiringSoon: number;
  documentTypes: {
    [key: string]: number;
  };
}

// API Functions
export const getAllEmployeeDocuments = async (
  page: number = 1,
  limit: number = 10,
  employee?: string,
  documentType?: string,
  status?: string,
  role?: string,
  sortBy: string = 'createdAt',
  sortOrder: string = 'desc'
) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });
    
    if (employee) params.append('employee', employee);
    if (documentType) params.append('documentType', documentType);
    if (status) params.append('status', status);
    if (role) params.append('role', role);

    const response: AxiosResponse<{
      success: boolean;
      data: EmployeeWithDocuments[];
      pagination: {
        current: number;
        pages: number;
        total: number;
        limit: number;
      };
    }> = await apiClient.get(`/employee-documents?${params.toString()}`);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching employee documents:', error);
    throw error;
  }
};

export const getEmployeeDocumentById = async (id: string) => {
  try {
    const response: AxiosResponse<{
      success: boolean;
      data: EmployeeDocument;
    }> = await apiClient.get(`/employee-documents/${id}`);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching employee document:', error);
    throw error;
  }
};

export const createEmployeeDocument = async (data: FormData) => {
  try {
    console.log('Creating employee document with data:', data);
    const response: AxiosResponse<{
      success: boolean;
      message: string;
      data: EmployeeDocument;
    }> = await apiClient.post('/employee-documents', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Employee document created successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating employee document:', error);
    console.error('Error response data:', error.response?.data);
    throw error;
  }
};

export const updateEmployeeDocument = async (id: string, data: FormData) => {
  try {
    const response: AxiosResponse<{
      success: boolean;
      message: string;
      data: EmployeeDocument;
    }> = await apiClient.put(`/employee-documents/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating employee document:', error);
    throw error;
  }
};

export const updateDocumentStatus = async (id: string, status: string, rejectionReason?: string) => {
  try {
    const response: AxiosResponse<{
      success: boolean;
      message: string;
      data: EmployeeDocument;
    }> = await apiClient.patch(`/employee-documents/${id}/status`, {
      status,
      rejectionReason
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating document status:', error);
    throw error;
  }
};

export const deleteEmployeeDocument = async (id: string) => {
  try {
    const response: AxiosResponse<{
      success: boolean;
      message: string;
    }> = await apiClient.delete(`/employee-documents/${id}`);
    
    return response.data;
  } catch (error) {
    console.error('Error deleting employee document:', error);
    throw error;
  }
};

export const getDocumentsByEmployee = async (employeeId: string) => {
  try {
    const response: AxiosResponse<{
      success: boolean;
      data: EmployeeDocument[];
    }> = await apiClient.get(`/employee-documents/employee/${employeeId}`);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching documents by employee:', error);
    throw error;
  }
};

export const getExpiringDocuments = async (days: number = 30) => {
  try {
    const response: AxiosResponse<{
      success: boolean;
      data: EmployeeDocument[];
    }> = await apiClient.get(`employee-documents/expiring?days=${days}`);
    
    return response.data;
  } catch (error: any) {
    console.error('Error fetching expiring documents:', error);
    // Return error structure instead of throwing
    return error?.response?.data || { success: false, message: error?.message || 'Failed to fetch expiring documents', data: [] };
  }
};

export const getEmployeeDocumentStats = async () => {
  try {
    const response: AxiosResponse<{
      success: boolean;
      data: DocumentStats;
    }> = await apiClient.get('/employee-documents/stats');
    
    return response.data;
  } catch (error) {
    console.error('Error fetching document stats:', error);
    throw error;
  }
};

export const bulkDeleteEmployeeDocuments = async (documentIds: string[]) => {
  try {
    const response: AxiosResponse<{
      success: boolean;
      message: string;
      deletedCount: number;
    }> = await apiClient.delete('/employee-documents/bulk/delete', {
      data: { documentIds }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error bulk deleting documents:', error);
    throw error;
  }
};

// Get all employees for dropdown
export const getAllEmployees = async () => {
  try {
    const response: AxiosResponse<{
      success: boolean;
      data: Array<{
        _id: string;
        name: string;
        email: string;
        internalId: string;
        role: string;
      }>;
    }> = await apiClient.get('/employee');
    
    return response.data;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
};

// Get signed URL for employee document
export const getSignedEmployeeDocumentUrl = async (
  documentId: string,
  disposition: 'inline' | 'attachment' = 'inline'
) => {
  try {
    const response: AxiosResponse<{
      success: boolean;
      url: string;
      expiresIn: number;
    }> = await apiClient.get(`/employee-documents/${documentId}/signed-url`, {
      params: { disposition }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching signed employee document URL:', error);
    throw error;
  }
};