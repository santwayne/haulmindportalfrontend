import  { type AxiosResponse } from 'axios'
import apiClient from '../apiClient'

interface Error {
  response?: {
    data?: {
      message: string,
    }
  }
}

export const createFuelReport = async (data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/fuel-report`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const getReporters = async () => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/fuel-report/reporters`);
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const createPlace = async (data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/place`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const deletePlace = async (id:string) =>{
    try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/place/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const listPlace = async () =>{
    try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/place`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const updatePlace = async (id:string, data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/place/${id}`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const updateStatusPlace = async (id:string) =>{
    try {
    const res: AxiosResponse = await apiClient.patch(`dispatcher/place/${id}/status`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}