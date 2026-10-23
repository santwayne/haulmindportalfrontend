import type { AxiosResponse } from "axios";
import apiClient from "../apiClient";

interface Error {
  response?: {
    data?: {
      message: string,
    }
  }
}

// ✅ Get All Plans (for admin to view)
export const getAllPlans = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('admin/plans');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Get My Active Subscription
export const getMySubscription = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('admin/subscription');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Get All My Subscriptions (history)
export const getMySubscriptions = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('admin/subscriptions');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Create Checkout Session
export const createCheckoutSession = async (data: { planId: string; subscriptionType: string; truckCount?: number }) => {
  try {
    const res: AxiosResponse = await apiClient.post('admin/subscription/checkout', data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Verify Stripe Checkout Session (fallback if webhook hasn't fired)
export const verifyCheckoutSession = async (sessionId: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`admin/subscription/verify?session_id=${sessionId}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Cancel Subscription
export const cancelSubscription = async (subscriptionId: string) => {
  try {
    const res: AxiosResponse = await apiClient.post(`admin/subscription/${subscriptionId}/cancel`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Add Extra Trucks to Active Subscription
export const addExtraTrucksCheckout = async (data: { planId: string; extraTruck: number }) => {
  try {
    const res: AxiosResponse = await apiClient.post('admin/subscription/add-truck-checkout', data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Get Trial Status
export const getTrialStatus = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('admin/trial/status');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Check Access (trial/subscription)
export const checkTrialAccess = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('admin/trial/check-access');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

