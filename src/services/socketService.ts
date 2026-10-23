import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;
  private isAuthenticated: boolean = false;
  token: string | null | undefined;

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Initialize socket connection
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Reuse if the same token — even while still connecting, to avoid destroying listeners
      if (this.socket && this.token === token) {
        if (this.socket.connected && this.isAuthenticated) {
          // Already fully ready
          resolve();
          return;
        }
        // Socket exists but still connecting/authenticating — wait for it
        const onAuth = () => { cleanup(); resolve(); };
        const onAuthErr = (err: any) => { cleanup(); reject(new Error(err?.message || "Auth failed")); };
        const onConnErr = (err: any) => { cleanup(); reject(err); };
        const cleanup = () => {
          this.socket?.off("authenticated", onAuth);
          this.socket?.off("auth_error", onAuthErr);
          this.socket?.off("connect_error", onConnErr);
        };
        this.socket.once("authenticated", onAuth);
        this.socket.once("auth_error", onAuthErr);
        this.socket.once("connect_error", onConnErr);
        return;
      }

      // Different token or no socket — create a fresh connection
      if (this.socket) {
        this.socket.disconnect();
      }

      this.token = token;
      // Extract base URL from VITE_APP_BASE_URL (remove /api/v1)
      const baseUrl = import.meta.env.VITE_APP_BASE_URL || "http://localhost:3000/api/v1";
      const socketUrl = baseUrl.replace("/api/v1", "") || "http://localhost:3000";

      this.socket = io(socketUrl, {
        path: "/socket.io/",
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        query: {
          token: token,
        },
      });

      this.socket.onAny((event, ...args) => {
        console.log("................................................")
        console.log("🎯 EVENT CAUGHT:", event, args);
      });

      // Connection events
      this.socket.on("connect", () => {
        console.log("✅ [FRONTEND] Socket connected:", this.socket?.id);
        console.log("✅ [FRONTEND] Socket transport:", this.socket?.io?.engine?.transport?.name);
        // Authenticate after connection
        this.authenticate(token);
      });

      // Store the callback so onAny can call it

      // Listen to ALL events for debugging (moved here so it's registered immediately)
      this.socket.onAny((eventName, ...args) => {
        if (eventName === 'documentUploadNotification') {
          console.log('🎯🎯🎯 [FRONTEND] onAny caught documentUploadNotification!', args);
          console.log('🎯 [FRONTEND] Raw event data:', args);

          // Handle array format
          let notificationData = args[0];
          if (Array.isArray(args[0]) && args[0].length > 0) {
            notificationData = args[0][0];
            console.log('🎯 [FRONTEND] Unwrapped from nested array:', notificationData);
          }

          console.log('🎯 [FRONTEND] Final notification data:', JSON.stringify(notificationData, null, 2));

          // Call the registered callback if it exists
          const callback = (this as any).documentUploadCallback;
          if (callback && notificationData) {
            console.log('🎯 [FRONTEND] Calling registered callback from onAny...');
            try {
              callback(notificationData);
              console.log('✅ [FRONTEND] Callback executed successfully from onAny');
            } catch (error) {
              console.error('❌ [FRONTEND] Error in callback from onAny:', error);
            }
          } else {
            console.log('⚠️ [FRONTEND] No callback registered yet or no notification data');
          }
        } else {
          console.log(`🔍 [FRONTEND] Socket event received: "${eventName}"`, args);
        }
      });
      console.log('✅ [FRONTEND] Catch-all event listener (onAny) registered immediately');

      this.socket.on("disconnect", () => {
        console.log("❌ Socket disconnected");
        this.isAuthenticated = false;
      });

      this.socket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error);
        reject(error);
      });

      // Authentication events
      this.socket.on("authenticated", (data) => {
        console.log("✅ [FRONTEND] Socket authenticated:", data);
        console.log("✅ [FRONTEND] User role:", data.role);
        console.log("✅ [FRONTEND] User company ID:", data.companyId);
        this.isAuthenticated = true;
        // Signal GlobalCallHandler to attach its listeners now
        window.dispatchEvent(new Event("socket-ready"));
        resolve();
      });

      this.socket.on("auth_error", (error) => {
        console.error("❌ Socket authentication error:", error);
        this.isAuthenticated = false;
        reject(new Error(error.message || "Authentication failed"));
        // Retry auth after delay — handles transient DB-not-ready errors on server startup
        setTimeout(() => {
          if (this.socket && this.socket.connected && !this.isAuthenticated && this.token) {
            console.log("🔄 [FRONTEND] Retrying socket authentication...");
            this.authenticate(this.token);
          }
        }, 3000);
      });

      // If already connected, authenticate immediately
      if (this.socket.connected) {
        this.authenticate(token);
      }
    });
  }

  // Authenticate socket
  private authenticate(token: string) {
    if (this.socket && !this.isAuthenticated) {
      this.socket.emit("authenticate", token);
    }
  }

  // Join trip chat room
  joinTripChat(tripId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isAuthenticated) {
        reject(new Error("Socket not connected or authenticated"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Join trip chat timeout"));
      }, 5000);

      this.socket.emit("joinTripChat", tripId);

      this.socket.once("joinedTripChat", (data) => {
        clearTimeout(timeout);
        console.log("✅ Joined trip chat:", data);
        resolve();
      });

      this.socket.once("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(error.message || "Failed to join trip chat"));
      });
    });
  }

  // Leave trip chat room
  leaveTripChat(tripId: string) {
    if (this.socket) {
      this.socket.emit("leaveTripChat", tripId);
    }
  }

  // Send chat message via socket
  sendChatMessage(data: {
    tripId: string;
    message: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  }) {
    if (this.socket && this.isAuthenticated) {
      this.socket.emit("sendChatMessage", data);
    } else {
      console.error("Socket not connected or authenticated");
    }
  }

  // Mark messages as read
  markMessagesRead(tripId: string) {
    if (this.socket && this.isAuthenticated) {
      this.socket.emit("markMessagesRead", tripId);
    }
  }

  // Typing indicator
  setTyping(tripId: string, isTyping: boolean) {
    if (this.socket && this.isAuthenticated) {
      this.socket.emit("typing", { tripId, isTyping });
    }
  }

  // Listen to new messages
  onNewMessage(callback: (message: any) => void) {
    if (this.socket) {
      // Register callback directly so offNewMessage can remove it by reference
      this.socket.on("newChatMessage", callback);
    } else {
      console.error("❌ socket not initialized");
    }
  }

  // Remove new message listener
  offNewMessage(callback?: (message: any) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off("newChatMessage", callback);
      } else {
        this.socket.off("newChatMessage");
      }
    }
  }

  // Listen to typing indicator
  onUserTyping(callback: (data: { userId: string; userName: string; tripId: string; isTyping: boolean }) => void) {
    if (this.socket) {
      this.socket.on("userTyping", callback);
    }
  }



  // Remove typing listener
  offUserTyping(callback?: (data: any) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off("userTyping", callback);
      } else {
        this.socket.off("userTyping");
      }
    }
  }

  // ==================== WEBRTC CALL METHODS ====================

// 📞 Send offer (caller → receiver)
callUser(data: { to: string; offer: any }) {
  if (this.socket && this.isAuthenticated) {
    console.log("📡 Emitting call-user", data);
    this.socket.emit("call-user", data);
  } else {
    console.error("❌ Socket not ready for call-user");
  }
}

// 📲 Send answer (receiver → caller)
answerCall(data: { to: string; answer: any }) {
  if (this.socket && this.isAuthenticated) {
    console.log("📡 Emitting answer-call", data);
    this.socket.emit("answer-call", data);
  } else {
    console.error("❌ Socket not ready for answer-call");
  }
}

// 🧊 Send ICE candidate (both sides)
sendIceCandidate(data: { to: string; candidate: any }) {
  if (this.socket && this.isAuthenticated) {
    console.log("🧊 Emitting call-ice", data);
    this.socket.emit("call-ice", data);
  } else {
    console.error("❌ Socket not ready for ICE");
  }
}

  // Listen to errors
  onError(callback: (error: { message: string }) => void) {
    if (this.socket) {
      this.socket.on("error", callback);
    }
  }

  // Remove error listener
  offError(callback?: (error: any) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off("error", callback);
      } else {
        this.socket.off("error");
      }
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isAuthenticated = false;
      this.token = null;
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Check if authenticated
  getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  // Note: Backend uses joinTripChat for both trips and orders
  // So we use joinTripChat for orders as well

  // Join driver chat room
  joinDriverChat(driverId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isAuthenticated) {
        reject(new Error("Socket not connected or authenticated"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Join driver chat timeout"));
      }, 5000);

      this.socket.emit("joinDriverChat", driverId);

      this.socket.once("joinedDriverChat", (data) => {
        clearTimeout(timeout);
        console.log("✅ Joined driver chat:", data);
        resolve();
      });

      this.socket.once("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(error.message || "Failed to join driver chat"));
      });
    });
  }

  // Leave driver chat room
  leaveDriverChat(driverId: string) {
    if (this.socket) {
      this.socket.emit("leaveDriverChat", driverId);
    }
  }

  // Send driver chat message via socket
  sendDriverChatMessage(data: {
    driverId: string;
    message: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  }) {
    if (this.socket && this.isAuthenticated) {
      this.socket.emit("sendDriverChatMessage", data);
    } else {
      console.error("Socket not connected or authenticated");
    }
  }

  // Typing indicator for driver chat
  setDriverTyping(driverId: string, isTyping: boolean) {
    if (this.socket && this.isAuthenticated) {
      this.socket.emit("driverTyping", { driverId, isTyping });
    }
  }

  // Listen to document upload notifications
  onDocumentUploadNotification(callback: (notification: {
    type: string;
    title: string;
    message: string;
    orderId: string;
    orderNumber: string;
    driverName: string;
    timestamp: string;
    link: string;
  }) => void) {
    console.log('🔔 [FRONTEND] onDocumentUploadNotification called');
    console.log('🔔 [FRONTEND] Socket exists?', !!this.socket);
    console.log('🔔 [FRONTEND] Socket connected?', this.socket?.connected);
    console.log('🔔 [FRONTEND] Socket ID:', this.socket?.id);
    console.log('🔔 [FRONTEND] Socket authenticated?', this.isAuthenticated);

    // Store callback for onAny handler
    (this as any).documentUploadCallback = callback;

    if (this.socket) {
      // Remove any existing listener first to avoid duplicates
      this.socket.off("documentUploadNotification");

      // Add new listener with enhanced logging
      this.socket.on("documentUploadNotification", (notification) => {
        console.log('🎉🎉🎉 [FRONTEND] documentUploadNotification EVENT RECEIVED! 🎉🎉🎉');
        console.log('📨 [FRONTEND] Raw notification data:', notification);
        console.log('📨 [FRONTEND] Notification type:', typeof notification);
        console.log('📨 [FRONTEND] Is array?', Array.isArray(notification));

        // Handle array format (Socket.IO sometimes wraps in array)
        let notificationData = notification;
        if (Array.isArray(notification) && notification.length > 0) {
          notificationData = notification[0];
          console.log('📨 [FRONTEND] Unwrapped from array:', notificationData);
        }

        console.log('📨 [FRONTEND] Final notification data:', JSON.stringify(notificationData, null, 2));
        console.log('📨 [FRONTEND] Notification keys:', notificationData ? Object.keys(notificationData) : 'null');
        console.log('📨 [FRONTEND] Order ID:', notificationData?.orderId);
        console.log('📨 [FRONTEND] Order Number:', notificationData?.orderNumber);
        console.log('📨 [FRONTEND] Driver Name:', notificationData?.driverName);
        console.log('📨 [FRONTEND] Message:', notificationData?.message);
        console.log('📨 [FRONTEND] Timestamp:', notificationData?.timestamp);
        console.log('📨 [FRONTEND] Link:', notificationData?.link);
        console.log('📨 [FRONTEND] Callback function exists?', typeof callback === 'function');
        console.log('📨 [FRONTEND] Calling callback function...');

        try {
          if (typeof callback === 'function') {
            callback(notificationData);
            console.log('✅ [FRONTEND] Callback executed successfully');
          } else {
            console.error('❌ [FRONTEND] Callback is not a function!', typeof callback);
          }
        } catch (error) {
          console.error('❌ [FRONTEND] Error in callback:', error);
          console.error('❌ [FRONTEND] Error stack:', error);
        }
      });

      console.log("✅ [FRONTEND] Socket listener 'documentUploadNotification' registered successfully");
      console.log("✅ [FRONTEND] Callback function:", callback.name || 'anonymous');

      // Also listen to all events for debugging
      this.socket.onAny((eventName, ...args) => {
        if (eventName === 'documentUploadNotification') {
          console.log('🔍 [FRONTEND] Caught documentUploadNotification via onAny:', args);
        }
      });
      console.log("🔍 [FRONTEND] Added catch-all listener for debugging");
    } else {
      console.error("❌ [FRONTEND] Cannot register 'documentUploadNotification' listener: socket not initialized");
      console.error("❌ [FRONTEND] Socket is null/undefined");
    }
  }

  // Listen to driver order acceptance updates
  onOrderAcceptanceUpdated(callback: (data: {
    orderId: string;
    orderNumber: string;
    driverAcceptanceStatus: 'accepted' | 'rejected';
    driverRejectionReason?: string;
    driverId: string;
    driverRespondedAt: string;
  }) => void) {
    if (this.socket) {
      this.socket.off('orderAcceptanceUpdated');
      this.socket.on('orderAcceptanceUpdated', callback);
    }
  }

  offOrderAcceptanceUpdated() {
    this.socket?.off('orderAcceptanceUpdated');
  }

  // Listen to driver trip acceptance updates
  onTripAcceptanceUpdated(callback: (data: {
    tripId: string;
    tripNumber: string;
    driverAcceptanceStatus: 'accepted' | 'rejected';
    driverRejectionReason?: string;
    driverId: string;
    driverRespondedAt: string;
  }) => void) {
    if (this.socket) {
      this.socket.off('tripAcceptanceUpdated');
      this.socket.on('tripAcceptanceUpdated', callback);
    }
  }

  offTripAcceptanceUpdated() {
    this.socket?.off('tripAcceptanceUpdated');
  }

  // Remove document upload notification listener
  offDocumentUploadNotification(callback?: (notification: any) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off("documentUploadNotification", callback);
      } else {
        this.socket.off("documentUploadNotification");
      }
    }
  }

}

// Export singleton instance
export const socketService = new SocketService();

