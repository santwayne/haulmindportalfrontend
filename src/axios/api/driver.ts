import apiClient from '../apiClient';
import type { AxiosResponse } from 'axios';

// Driver interfaces
export interface Driver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  mobile?: string;
  company?: string;
  gender?: string;
  csa?: string;
  status: 'active' | 'inactive';
  address?: string;
  citizenship?: string;
  country?: string;
  employmentDetails?: string;
  wsib?: string;
  fastCard?: string;
  medicalTracking?: string;
  role?: string;
  internalId: string;
  joinDate: string;
  profileImageUrl?: string | null;
  policies?: string;
  lastModified?: string;
  createdAt?: string;
  updatedAt?: string;
}

// API Functions
export const getAllDrivers = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
  ownerOperatorOnly?: boolean
) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (ownerOperatorOnly === true) params.append('ownerOperator', 'true');

    const res: AxiosResponse = await apiClient.get(`hr/driver?${params.toString()}`);
    console.log('🔍 Driver API response:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching drivers:', error);
    return (error as any).response?.data;
  }
};

// Get all users for drug test (excluding admin and superadmin)
export const getAllUsersForDrugTest = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('hr/users-for-drug-test');
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching users for drug test:', error);
    return (error as any).response?.data;
  }
};

export const getDriverById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/driver/${id}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching driver:', error);
    return (error as any).response?.data;
  }
};

export const createDriver = async (data: FormData) => {
  try {
    console.log('🔍 Creating driver with data:', data);
    const res: AxiosResponse = await apiClient.post('hr/driver', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('✅ Driver created successfully:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ Error creating driver:', error);
    return (error as any).response?.data;
  }
};

export const updateDriver = async (id: string, data: FormData) => {
  try {
    const res: AxiosResponse = await apiClient.put(`hr/driver/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (error) {
    console.error('❌ Error updating driver:', error);
    return (error as any).response?.data;
  }
};

export const updateDriverStatus = async (id: string, status: string) => {
  try {
    const res: AxiosResponse = await apiClient.patch(`hr/driver/${id}/status`, { status });
    return res.data;
  } catch (error) {
    console.error('❌ Error updating driver status:', error);
    return (error as any).response?.data;
  }
};

export const deleteDriver = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`hr/driver/${id}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error deleting driver:', error);
    return (error as any).response?.data;
  }
};

export const bulkDeleteDrivers = async (ids: string[]) => {
  try {
    const res: AxiosResponse = await apiClient.delete('hr/driver/bulk/delete', { data: { ids } });
    return res.data;
  } catch (error) {
    console.error('❌ Error bulk deleting drivers:', error);
    return (error as any).response?.data;
  }
};

export const getDriverStats = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('hr/driver/stats');
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching driver stats:', error);
    return (error as any).response?.data;
  }
};

// Generate internal ID for new drivers
export const generateInternalId = (role: string = 'driver') => {
  const timestamp = Date.now().toString().slice(-6);
  const rolePrefix = role === 'driver' ? 'DRV' : 'EMP';
  return `${rolePrefix}-${timestamp}`;
};

// ==================== TRAINING CERTIFICATE APIs ====================
export interface TrainingCertificate {
  _id?: string;
  driverId: string;
  driverName?: string;
  certificateName: string;
  certificateType: string;
  issuedDate: string;
  expiryDate?: string;
  issuingAuthority: string;
  certificateNumber?: string;
  fileUrl?: string;
  fileName?: string;
  status: 'active' | 'expired' | 'expiring_soon';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const getTrainingCertificates = async (params?: {
  search?: string;
  driverId?: string;
  certificateType?: string;
  status?: string;
}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.driverId) queryParams.append('driverId', params.driverId);
    if (params?.certificateType) queryParams.append('certificateType', params.certificateType);
    if (params?.status) queryParams.append('status', params.status);
    
    const queryString = queryParams.toString();
    const url = `hr/driver/training-certificate${queryString ? `?${queryString}` : ''}`;
    const res: AxiosResponse = await apiClient.get(url);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching training certificates:', error);
    return (error as any).response?.data;
  }
};

export const getTrainingCertificateById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/driver/training-certificate/${id}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching training certificate:', error);
    return (error as any).response?.data;
  }
};

export const createTrainingCertificate = async (formData: FormData) => {
  try {
    const res: AxiosResponse = await apiClient.post('hr/driver/training-certificate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  } catch (error) {
    console.error('❌ Error creating training certificate:', error);
    return (error as any).response?.data;
  }
};

export const updateTrainingCertificate = async (id: string, formData: FormData) => {
  try {
    const res: AxiosResponse = await apiClient.put(`hr/driver/training-certificate/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  } catch (error) {
    console.error('❌ Error updating training certificate:', error);
    return (error as any).response?.data;
  }
};

export const deleteTrainingCertificate = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`hr/driver/training-certificate/${id}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error deleting training certificate:', error);
    return (error as any).response?.data;
  }
};

export const getTrainingCertificateSignedUrl = async (id: string, disposition: 'inline' | 'attachment' = 'inline') => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/driver/training-certificate/${id}/signed-url?disposition=${disposition}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error getting training certificate signed URL:', error);
    return (error as any).response?.data;
  }
};

// ==================== QUESTION BANK APIs ====================
export interface Question {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface QuestionBank {
  _id?: string;
  testName: string;
  testType: 'TDG' | 'VEHICLE' | 'HOS' | 'WINTER';
  passingPercentage: number;
  mandatory?: boolean;
  questions: Question[];
  createdAt?: string;
  updatedAt?: string;
}

export const getQuestionBanks = async (params?: { testType?: string; role?: string }) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.testType) queryParams.append('testType', params.testType);
    if (params?.role) queryParams.append('role', params.role);
    
    const queryString = queryParams.toString();
    const url = `hr/driver/question-bank${queryString ? `?${queryString}` : ''}`;
    console.log('📤 Fetching question banks from:', url);
    const res: AxiosResponse = await apiClient.get(url);
    console.log('✅ Question banks fetched:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching question banks:', error);
    console.error('❌ Error response:', (error as any).response?.data);
    return (error as any).response?.data || { success: false, message: 'Network error' };
  }
};

export const getQuestionBankById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/driver/question-bank/${id}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching question bank:', error);
    return (error as any).response?.data;
  }
};

export const createQuestionBank = async (data: Omit<QuestionBank, '_id' | 'createdAt' | 'updatedAt'>) => {
  try {
    console.log('📤 Creating question bank with data:', data);
    const res: AxiosResponse = await apiClient.post('hr/driver/question-bank', data);
    console.log('✅ Question bank created successfully:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ Error creating question bank:', error);
    console.error('❌ Error response:', (error as any).response?.data);
    console.error('❌ Error status:', (error as any).response?.status);
    return (error as any).response?.data || { success: false, message: 'Network error' };
  }
};

export const updateQuestionBank = async (id: string, data: Partial<QuestionBank>) => {
  try {
    console.log('📤 Updating question bank:', id, 'with data:', data);
    const res: AxiosResponse = await apiClient.put(`hr/driver/question-bank/${id}`, data);
    console.log('✅ Question bank updated successfully:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ Error updating question bank:', error);
    console.error('❌ Error response:', (error as any).response?.data);
    return (error as any).response?.data || { success: false, message: 'Network error' };
  }
};

export const deleteQuestionBank = async (id: string) => {
  try {
    console.log('📤 Deleting question bank:', id);
    const res: AxiosResponse = await apiClient.delete(`hr/driver/question-bank/${id}`);
    console.log('✅ Question bank deleted successfully:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ Error deleting question bank:', error);
    console.error('❌ Error response:', (error as any).response?.data);
    return (error as any).response?.data || { success: false, message: 'Network error' };
  }
};

// ==================== TRAINING CONTENT APIs ====================
export interface TrainingContent {
  _id?: string;
  name: string;
  type: 'PDF' | 'VIDEO' | 'IMAGE';
  testType: 'TDG' | 'VEHICLE' | 'HOS' | 'WINTER';
  fileUrl?: string;
  fileName?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const getTrainingContent = async (params?: { testType?: string; type?: string; role?: string }) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.testType) queryParams.append('testType', params.testType);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.role) queryParams.append('role', params.role);
    
    const queryString = queryParams.toString();
    const url = `hr/driver/training-content${queryString ? `?${queryString}` : ''}`;
    const res: AxiosResponse = await apiClient.get(url);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching training content:', error);
    return (error as any).response?.data;
  }
};

export const getTrainingContentById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/driver/training-content/${id}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching training content:', error);
    return (error as any).response?.data;
  }
};

export const createTrainingContent = async (formData: FormData) => {
  try {
    const res: AxiosResponse = await apiClient.post('hr/driver/training-content', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  } catch (error) {
    console.error('❌ Error creating training content:', error);
    return (error as any).response?.data;
  }
};

export const updateTrainingContent = async (id: string, formData: FormData) => {
  try {
    const res: AxiosResponse = await apiClient.put(`hr/driver/training-content/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  } catch (error) {
    console.error('❌ Error updating training content:', error);
    return (error as any).response?.data;
  }
};

export const deleteTrainingContent = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`hr/driver/training-content/${id}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error deleting training content:', error);
    return (error as any).response?.data;
  }
};

export const getTrainingContentSignedUrl = async (id: string, disposition: 'inline' | 'attachment' = 'inline') => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/driver/training-content/${id}/signed-url?disposition=${disposition}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error getting training content signed URL:', error);
    return (error as any).response?.data;
  }
};

// ==================== TEST RESULT APIs ====================
export interface TestResult {
  _id?: string;
  driverId: string;
  driverName?: string;
  testType: 'TDG' | 'VEHICLE' | 'HOS' | 'WINTER';
  questionBankId?: string;
  score: number;
  passed: boolean;
  attempts: number;
  answers: Array<{
    questionId: string;
    selectedAnswer: number;
    isCorrect: boolean;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export const getTestResults = async (params?: { driverId?: string; testType?: string }) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.driverId) queryParams.append('driverId', params.driverId);
    if (params?.testType) queryParams.append('testType', params.testType);
    
    const queryString = queryParams.toString();
    const url = `hr/driver/test-result${queryString ? `?${queryString}` : ''}`;
    const res: AxiosResponse = await apiClient.get(url);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching test results:', error);
    return (error as any).response?.data;
  }
};

// ==================== TEST TYPE APIs ====================
export interface TestType {
  _id: string;
  name: string;
  displayName: string;
  company: string;
  createdBy: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const createTestType = async (data: { name: string; displayName: string }) => {
  try {
    const res: AxiosResponse = await apiClient.post('hr/driver/test-type', data);
    return res.data;
  } catch (error) {
    console.error('❌ Error creating test type:', error);
    return (error as any).response?.data;
  }
};

export const getTestTypes = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('hr/driver/test-type');
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching test types:', error);
    return (error as any).response?.data;
  }
};

export const updateTestType = async (id: string, data: { displayName?: string; isActive?: boolean }) => {
  try {
    const res: AxiosResponse = await apiClient.put(`hr/driver/test-type/${id}`, data);
    return res.data;
  } catch (error) {
    console.error('❌ Error updating test type:', error);
    return (error as any).response?.data;
  }
};

export const deleteTestType = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`hr/driver/test-type/${id}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error deleting test type:', error);
    return (error as any).response?.data;
  }
};

export const getTestResultById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/driver/test-result/${id}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching test result:', error);
    return (error as any).response?.data;
  }
};

export const uploadDriverDrugTest = async (driverId: string, formData: FormData) => {
  try {
    const res: AxiosResponse = await apiClient.post(`hr/driver/${driverId}/drug-test`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  } catch (error) {
    console.error('❌ Error uploading drug test:', error);
    return (error as any).response?.data;
  }
};

export const deleteDriverDrugTest = async (driverId: string, testIndex: number) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`hr/driver/${driverId}/drug-test/${testIndex}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error deleting drug test:', error);
    return (error as any).response?.data;
  }
};

export const getDriverTicketSignedUrl = async (ticketId: string, disposition: 'inline' | 'attachment' = 'inline') => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/driver/ticket/${ticketId}/signed-url?disposition=${disposition}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching ticket signed URL:', error);
    return (error as any).response?.data;
  }
};

export const getDriverDrugTestSignedUrl = async (driverId: string, testIndex: number, documentType: 'consent' | 'result', disposition: 'inline' | 'attachment' = 'inline') => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/driver/${driverId}/drug-test/${testIndex}/signed-url/${documentType}?disposition=${disposition}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error getting drug test signed URL:', error);
    return (error as any).response?.data;
  }
};

export const submitTestResult = async (data: {
  driverId: string;
  testType: string;
  questionBankId?: string;
  answers: Array<{
    questionId: string;
    selectedAnswer: number;
    isCorrect?: boolean;
  }>;
}) => {
  try {
    const res: AxiosResponse = await apiClient.post('hr/driver/test-result', data);
    return res.data;
  } catch (error) {
    console.error('❌ Error submitting test result:', error);
    return (error as any).response?.data;
  }
};

export const getDriverTestStatus = async (driverId: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/driver/${driverId}/test-status`);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching driver test status:', error);
    return (error as any).response?.data;
  }
};

// Get driver onboarding status
export const getDriverOnboardingStatus = async (driverId: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/driver/onboarding/${driverId}/status`);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching driver onboarding status:', error);
    return (error as any).response?.data;
  }
};

// Approve a test result
export const approveTestResult = async (testResultId: string) => {
  try {
    const res: AxiosResponse = await apiClient.put(`hr/driver/test-result/${testResultId}/approve`);
    return res.data;
  } catch (error) {
    console.error('❌ Error approving test:', error);
    return (error as any).response?.data;
  }
};

// Reject a test result
export const rejectTestResult = async (testResultId: string, reason?: string) => {
  try {
    const res: AxiosResponse = await apiClient.put(`hr/driver/test-result/${testResultId}/reject`, { reason });
    return res.data;
  } catch (error) {
    console.error('❌ Error rejecting test:', error);
    return (error as any).response?.data;
  }
};

// ==================== DRUG TEST APIs ====================
export interface DrugTestRequest {
  _id?: string;
  driverId: string;
  driverName?: string;
  testType: string;
  reason: string;
  scheduledDate: string;
  scheduledTime?: string;
  labName: string;
  consentFormUrl?: string;
  drugTestDocumentUrl?: string;
  collectionSiteName?: string;
  collectionSiteAddress?: string;
  collectionSitePhone?: string;
  importantDetails?: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}

export const getDrugTests = async (params?: {
  search?: string;
  driverId?: string;
  status?: string;
  testType?: string;
}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.driverId) queryParams.append('driverId', params.driverId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.testType) queryParams.append('testType', params.testType);
    
    const queryString = queryParams.toString();
    const url = `hr/driver/drug-test${queryString ? `?${queryString}` : ''}`;
    const res: AxiosResponse = await apiClient.get(url);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching drug tests:', error);
    return (error as any).response?.data;
  }
};

export const getDrugTestById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/driver/drug-test/${id}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error fetching drug test:', error);
    return (error as any).response?.data;
  }
};

export const createDrugTest = async (data: DrugTestRequest | FormData) => {
  try {
    // Axios automatically handles FormData and sets Content-Type with boundary
    const res: AxiosResponse = await apiClient.post('hr/driver/drug-test', data);
    return res.data;
  } catch (error) {
    console.error('❌ Error creating drug test:', error);
    return (error as any).response?.data;
  }
};

export const updateDrugTest = async (id: string, data: Partial<DrugTestRequest> | FormData) => {
  try {
    // Axios automatically handles FormData and sets Content-Type with boundary
    const res: AxiosResponse = await apiClient.put(`hr/driver/drug-test/${id}`, data);
    return res.data;
  } catch (error) {
    console.error('❌ Error updating drug test:', error);
    return (error as any).response?.data;
  }
};

export const deleteDrugTest = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`hr/driver/drug-test/${id}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error deleting drug test:', error);
    return (error as any).response?.data;
  }
};

// Verify password for drug test section access
export const verifyDrugTestPassword = async (password: string) => {
  try {
    console.log('🔐 Verifying drug test password...');
    console.log('🔐 API Endpoint: hr/driver/drug-test/verify-password');
    const res: AxiosResponse = await apiClient.post('hr/driver/drug-test/verify-password', { password });
    console.log('✅ Password verification response:', res.data);
    console.log('✅ Response status:', res.status);
    return res.data;
  } catch (error: any) {
    console.error('❌ Error verifying drug test password:', error);
    console.error('❌ Error response data:', error?.response?.data);
    console.error('❌ Error status:', error?.response?.status);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Full error:', error);
    
    // For 400 errors (incorrect password), return the error response data
    if (error?.response?.status === 400 && error?.response?.data) {
      console.log('📥 Returning 400 error response:', error.response.data);
      return error.response.data;
    }
    
    // For other errors, return error response data if available
    if (error?.response?.data) {
      return error.response.data;
    }
    
    // If no response data, return a generic error
    return {
      success: false,
      message: error?.message || 'Failed to verify password. Please check your connection and try again.'
    };
  }
};