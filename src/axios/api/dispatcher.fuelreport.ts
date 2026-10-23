import  { type AxiosResponse } from 'axios'
import apiClient from '../apiClient'

interface Error {
  response?: {
    data?: {
      message: string,
    }
  }
}



export const listFuelReport = async (params?: { page?: number; limit?: number; search?: string; status?: string; sortBy?: string; sortOrder?: string }) => {
    try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const url = `dispatcher/fuel-report${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const res: AxiosResponse = await apiClient.get(url);
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const updateFuelReport = async (id:string, data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/fuel-report/${id}`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const deleteFuelReport = async (id:string) =>{
    try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/fuel-report/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const updateStatusFuelReport = async (id:string, status: any) =>{
    try {
    const res: AxiosResponse = await apiClient.patch(`dispatcher/fuel-report/${id}/status`,status);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const getFuelTypes = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('dispatcher/fuel-types');
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const createFuelType = async (name: string) => {
  try {
    const res: AxiosResponse = await apiClient.post('dispatcher/fuel-types', { name });
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const getUnits = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('dispatcher/units');
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const createUnit = async (name: string) => {
  try {
    const res: AxiosResponse = await apiClient.post('dispatcher/units', { name });
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const getFuelVendors = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('dispatcher/fuel-vendors');
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const createFuelVendor = async (name: string) => {
  try {
    const res: AxiosResponse = await apiClient.post('dispatcher/fuel-vendors', { name });
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const extractFuelReceipt = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('receipt', file);
    
    const res: AxiosResponse = await apiClient.post(`dispatcher/fuel-report/extract-receipt`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  } catch (error: any) {
    const err = error as Error;
    return err.response?.data;
  }
}

export const parseCsvHeaders = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('csv', file);
    
    const res: AxiosResponse = await apiClient.post(`dispatcher/fuel-report/parse-csv`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  } catch (error: any) {
    const err = error as Error;
    return err.response?.data;
  }
}

export const importFuelReportsFromCsv = async (file: File, columnMapping: Record<string, string>, defaultUnit?: string, defaultCurrency?: string, defaultProduct?: string) => {
  try {
    const formData = new FormData();
    formData.append('csv', file);
    formData.append('columnMapping', JSON.stringify(columnMapping));
    if (defaultUnit) formData.append('defaultUnit', defaultUnit);
    if (defaultCurrency) formData.append('defaultCurrency', defaultCurrency);
    if (defaultProduct) formData.append('defaultProduct', defaultProduct);
    
    const res: AxiosResponse = await apiClient.post(`dispatcher/fuel-report/import-csv`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  } catch (error: any) {
    const err = error as Error;
    return err.response?.data;
  }
}