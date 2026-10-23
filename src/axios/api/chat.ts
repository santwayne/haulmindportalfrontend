import type { AxiosResponse } from "axios";
import apiClient from "../apiClient";



export interface TripStatusData {
  driver: {
    name: string;
    email: string;
    phone?: string;
    status: string;
  };
  activeTrips: Array<{
    tripNumber: string;
    status: string;
    plannedStartDate?: string;
    actualStartDate?: string;
    plannedEndDate?: string;
    startLocation: string;
    endLocation: string;
    ordersCount: number;
    truck: string;
    trailer: string;
    driverRole?: string;
    mainDriver?: string;
    coDriver?: string;
  }>;
  activeOrders: Array<{
    orderNumber: string;
    status: string;
    pickupDate?: string;
    deliveryDate?: string;
    actualStartDate?: string;
    pickupLocation: string;
    pickupFullAddress?: string;
    deliveryLocation: string;
    deliveryFullAddress?: string;
    customer: string;
    truck: string;
    trailer: string;
  }>;
  pendingTrips: Array<{
    tripNumber: string;
    status: string;
    plannedStartDate?: string;
    startLocation: string;
    endLocation: string;
    ordersCount: number;
    driverRole?: string;
    mainDriver?: string;
    coDriver?: string;
  }>;
  pendingOrders: Array<{
    orderNumber: string;
    status: string;
    pickupDate?: string;
    deliveryDate?: string;
    pickupLocation: string;
    pickupFullAddress?: string;
    deliveryLocation: string;
    deliveryFullAddress?: string;
    customer: string;
  }>;
  aiSummary?: string;
  summary: {
    hasActiveTrips: boolean;
    hasActiveOrders: boolean;
    hasPendingTrips: boolean;
    hasPendingOrders: boolean;
    isCurrentlyDriving: boolean;
    totalActive: number;
    totalPending: number;
  };
}

export interface ChatMessage {
  _id: any; // Can be string or ObjectId-like object
  tripId?: string; // Optional for backward compatibility
  orderId?: string; // New field for orders
  driverId?: any; // Can be string or ObjectId-like object
  senderId: any; // Can be string, object with _id, or populated object
  senderType: "driver" | "dispatcher" | "admin" | "system";
  senderName: string;
  message: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: "image" | "pdf" | "document" | "other";
  fileSize?: number;
  tripStatus?: TripStatusData; // Trip status data from AI
  isSystemMessage?: boolean; // Flag for system messages
  forDispatchersOnly?: boolean; // Flag for dispatcher-only messages
  readBy: Array<{
    userId: string;
    readAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessagesResponse {
  success: boolean;
  data: {
    messages: ChatMessage[];
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  };
  message: string;
}

// Get chat messages for a trip
export const getTripChatMessages = async (
  tripId: string,
  page: number = 1,
  limit: number = 50
): Promise<ChatMessagesResponse> => {
  try {
    const res: AxiosResponse = await apiClient.get(
      `chat/trip/${tripId}/messages`,
      {
        params: { page, limit },
      }
    );
    return res.data;
  } catch (error) {
    console.error("Get chat messages error:", error);
    return {
      success: false,
      message: (error as any).response?.data?.message || "Failed to fetch chat messages",
      data: { messages: [], pagination: { current: 1, pages: 0, total: 0, limit: 50 } },
    };
  }
};

// Send a chat message (with optional file)
export const sendChatMessage = async (
  tripId: string,
  message: string,
  file?: File
): Promise<{ success: boolean; data?: ChatMessage; message: string }> => {
  try {
    const formData = new FormData();
    formData.append("message", message);
    if (file) {
      formData.append("file", file);
    }

    const res: AxiosResponse = await apiClient.post(
      `chat/trip/${tripId}/message`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return res.data;
  } catch (error) {
    console.error("Send chat message error:", error);
    return {
      success: false,
      message: (error as any).response?.data?.message || "Failed to send message",
    };
  }
};

// Mark messages as read
export const markMessagesAsRead = async (
  tripId: string
): Promise<{ success: boolean; message: string; count?: number }> => {
  try {
    const res: AxiosResponse = await apiClient.post(
      `chat/trip/${tripId}/mark-read`
    );
    return res.data;
  } catch (error) {
    console.error("Mark messages as read error:", error);
    return {
      success: false,
      message: (error as any).response?.data?.message || "Failed to mark messages as read",
    };
  }
};

// Get unread message count
export const getUnreadMessageCount = async (
  tripId: string
): Promise<{ success: boolean; data: { unreadCount: number } }> => {
  try {
    const res: AxiosResponse = await apiClient.get(
      `chat/trip/${tripId}/unread-count`
    );
    return res.data;
  } catch (error) {
    console.error("Get unread count error:", error);
    return {
      success: false,
      data: { unreadCount: 0 },
    };
  }
};

// Get signed URL for chat message file
export const getChatMessageFileSignedUrl = async (
  messageId: string,
  disposition: 'inline' | 'attachment' = 'inline'
): Promise<{ success: boolean; url: string; expiresIn: number }> => {
  try {
    const res: AxiosResponse = await apiClient.get(
      `chat/message/${messageId}/file-signed-url`,
      { params: { disposition } }
    );
    return res.data;
  } catch (error) {
    console.error("Get chat message file signed URL error:", error);
    return {
      success: false,
      url: '',
      expiresIn: 0,
    };
  }
};

// ===== ORDER CHAT FUNCTIONS (New) =====

// Get chat messages for an order
export const getOrderChatMessages = async (
  orderId: string,
  page: number = 1,
  limit: number = 50
): Promise<ChatMessagesResponse> => {
  try {
    const res: AxiosResponse = await apiClient.get(
      `chat/order/${orderId}/messages`,
      {
        params: { page, limit },
      }
    );
    return res.data;
  } catch (error) {
    console.error("Get order chat messages error:", error);
    return {
      success: false,
      message: (error as any).response?.data?.message || "Failed to fetch chat messages",
      data: { messages: [], pagination: { current: 1, pages: 0, total: 0, limit: 50 } },
    };
  }
};

// Send a chat message for an order (with optional file)
export const sendOrderChatMessage = async (
  orderId: string,
  message: string,
  file?: File
): Promise<{ success: boolean; data?: ChatMessage; message: string }> => {
  try {
    const formData = new FormData();
    formData.append("message", message);
    if (file) {
      formData.append("file", file);
    }

    const res: AxiosResponse = await apiClient.post(
      `chat/order/${orderId}/message`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return res.data;
  } catch (error) {
    console.error("Send order chat message error:", error);
    return {
      success: false,
      message: (error as any).response?.data?.message || "Failed to send message",
    };
  }
};

// Mark order messages as read
export const markOrderMessagesAsRead = async (
  orderId: string
): Promise<{ success: boolean; message: string; count?: number }> => {
  try {
    const res: AxiosResponse = await apiClient.post(
      `chat/order/${orderId}/mark-read`
    );
    return res.data;
  } catch (error) {
    console.error("Mark order messages as read error:", error);
    return {
      success: false,
      message: (error as any).response?.data?.message || "Failed to mark messages as read",
    };
  }
};

// Get unread message count for an order
export const getOrderUnreadMessageCount = async (
  orderId: string
): Promise<{ success: boolean; data: { unreadCount: number } }> => {
  try {
    const res: AxiosResponse = await apiClient.get(
      `chat/order/${orderId}/unread-count`
    );
    return res.data;
  } catch (error) {
    console.error("Get order unread count error:", error);
    return {
      success: false,
      data: { unreadCount: 0 },
    };
  }
};

// ===== DRIVER CHAT FUNCTIONS =====

// Get chat messages for a driver
export const getDriverChatMessages = async (
  driverId: string,
  page: number = 1,
  limit: number = 50
): Promise<ChatMessagesResponse> => {
  try {
    const res: AxiosResponse = await apiClient.get(
      `chat/driver/${driverId}/messages`,
      {
        params: { page, limit },
      }
    );

    
    return res.data;
  } catch (error) {
    console.error("Get driver chat messages error:", error);
    return {
      success: false,
      message: (error as any).response?.data?.message || "Failed to fetch chat messages",
      data: { messages: [], pagination: { current: 1, pages: 0, total: 0, limit: 50 } },
    };
  }
};

// Send a chat message to a driver (with optional file)
export const sendDriverChatMessage = async (
  driverId: string,
  message: string,
  file?: File
): Promise<{ success: boolean; data?: ChatMessage; message: string }> => {
  try {
    const formData = new FormData();
    formData.append("message", message);
    if (file) {
      formData.append("file", file);
    }

    const res: AxiosResponse = await apiClient.post(
      `chat/driver/${driverId}/message`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return res.data;
  } catch (error) {
    console.error("Send driver chat message error:", error);
    return {
      success: false,
      message: (error as any).response?.data?.message || "Failed to send message",
    };
  }
};

// Mark driver messages as read
export const markDriverMessagesAsRead = async (
  driverId: string
): Promise<{ success: boolean; message: string; count?: number }> => {
  try {
    const res: AxiosResponse = await apiClient.post(
      `chat/driver/${driverId}/mark-read`
    );
    return res.data;
  } catch (error) {
    console.error("Mark driver messages as read error:", error);
    return {
      success: false,
      message: (error as any).response?.data?.message || "Failed to mark messages as read",
    };
  }
};

// Get last message + unread count for all drivers (for dispatcher sidebar sort)
export const getDriversLastMessages = async (): Promise<{
  success: boolean;
  data: Array<{
    driverId: string;
    lastMessage: { _id: string; message: string; fileUrl?: string; senderType: string; createdAt: string } | null;
    unreadCount: number;
  }>;
}> => {
  try {
    const res: AxiosResponse = await apiClient.get('chat/drivers/last-messages');
    return res.data;
  } catch (error) {
    return { success: false, data: [] };
  }
};

// Get unread message count for a driver
export const getDriverUnreadMessageCount = async (
  driverId: string
): Promise<{ success: boolean; data: { unreadCount: number } }> => {
  try {
    const res: AxiosResponse = await apiClient.get(
      `chat/driver/${driverId}/unread-count`
    );
    return res.data;
  } catch (error) {
    console.error("Get driver unread count error:", error);
    return {
      success: false,
      data: { unreadCount: 0 },
    };
  }
};

