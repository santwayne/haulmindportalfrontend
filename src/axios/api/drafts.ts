import axios from 'axios';
import apiClient from '../apiClient';
import type { AxiosResponse } from 'axios';

// Form auto-save draft APIs
// entityType is one of: drivers | trucks | trailers | employees | trips
// entityId is the record's id, or the literal string "new" for a creation-form draft

export type DraftEntityType = 'drivers' | 'trucks' | 'trailers' | 'employees' | 'trips';

export interface DraftRecord {
  formData: Record<string, unknown>;
  updatedAt: string;
}

export interface DraftResponse {
  success: boolean;
  message?: string;
  draft?: DraftRecord | null;
}

const extractErrorResponse = (error: unknown): DraftResponse => {
  if (axios.isAxiosError(error) && error.response?.data) {
    return error.response.data as DraftResponse;
  }
  return { success: false, message: 'Network error' };
};

export const getDraft = async (
  entityType: DraftEntityType,
  entityId: string
): Promise<DraftResponse> => {
  try {
    const res: AxiosResponse = await apiClient.get(`drafts/${entityType}/${entityId}`);
    // Backend returns the draft under `data`; normalise to `draft` for callers.
    return { ...res.data, draft: res.data?.draft ?? res.data?.data ?? null };
  } catch (error) {
    // A missing draft is a normal "nothing saved yet" state, not an error worth surfacing.
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { success: true, draft: null };
    }
    console.error('❌ Error fetching draft:', error);
    return extractErrorResponse(error);
  }
};

export const saveDraft = async (
  entityType: DraftEntityType,
  entityId: string,
  formData: Record<string, unknown>
): Promise<DraftResponse> => {
  try {
    const res: AxiosResponse = await apiClient.put(`drafts/${entityType}/${entityId}`, { formData });
    return res.data;
  } catch (error) {
    console.error('❌ Error saving draft:', error);
    return extractErrorResponse(error);
  }
};

export const deleteDraft = async (
  entityType: DraftEntityType,
  entityId: string
): Promise<DraftResponse> => {
  try {
    const res: AxiosResponse = await apiClient.delete(`drafts/${entityType}/${entityId}`);
    return res.data;
  } catch (error) {
    console.error('❌ Error deleting draft:', error);
    return extractErrorResponse(error);
  }
};
