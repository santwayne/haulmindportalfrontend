import apiClient from '../apiClient';

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface AIChatResponse {
  success: boolean;
  data: {
    message: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
  message?: string;
  error?: string;
}

export interface AIChatRequest {
  message: string;
  conversationHistory?: AIChatMessage[];
}

/**
 * Send a message to the AI chat
 */
export const sendAIChatMessage = async (
  request: AIChatRequest
): Promise<AIChatResponse> => {
  try {
    const response = await apiClient.post<AIChatResponse>(
      '/ai/chat',
      request
    );
    return response.data;
  } catch (error: any) {
    console.error('Error sending AI chat message:', error);
    return {
      success: false,
      data: {
        message: error.response?.data?.message || 'Failed to get AI response',
      },
      error: error.response?.data?.error || error.message,
    };
  }
};

