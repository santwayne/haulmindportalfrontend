import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Paperclip, X, File, Image as ImageIcon, Check, CheckCheck } from "lucide-react";
import { socketService } from "../../services/socketService";
import {
  getOrderChatMessages,
  sendOrderChatMessage as sendChatMessageAPI,
  markOrderMessagesAsRead,
  getChatMessageFileSignedUrl,
  type ChatMessage,
} from "../../axios/api/chat";

interface OrderChatProps {
  orderId: string;
  orderNumber: string;
  onClose?: () => void;
}

const OrderChat: React.FC<OrderChatProps> = ({ orderId, orderNumber, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Load messages
  const loadMessages = async () => {
    try {
      setLoading(true);
      console.log("📨 Loading messages for order:", orderId);
      console.log("📨 API endpoint:", `chat/order/${orderId}/messages`);
      const response = await getOrderChatMessages(orderId, 1, 100);
      console.log("📨 Messages response:", response);
      
      if (response && response.success && response.data) {
        const msgs = response.data.messages || [];
        console.log("📨 Setting messages:", msgs.length, "messages");
        console.log("📨 First message:", msgs[0]);
        setMessages(msgs);
        scrollToBottom();
      } else {
        console.error("❌ Failed to load messages:", response);
        // Set empty messages array to show "No messages" instead of loading forever
        setMessages([]);
      }
    } catch (error) {
      console.error("❌ Error loading messages:", error);
      // Set empty messages array on error
      setMessages([]);
    } finally {
      console.log("📨 Loading complete, setting loading to false");
      setLoading(false);
    }
  };

  // Initialize socket and load messages
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("❌ No token found");
      setLoading(false);
      return;
    }

    console.log("🔌 Connecting to socket for order:", orderId);

    // Load messages immediately (don't wait for socket)
    loadMessages();

    // Connect and authenticate socket
    socketService
      .connect(token)
      .then(() => {
        console.log("✅ Socket connected");
        // Join order chat room (backend uses joinTripChat for both trips and orders)
        return socketService.joinTripChat(orderId);
      })
      .then(() => {
        console.log("✅ Joined order chat room");
        // Mark messages as read
        markOrderMessagesAsRead(orderId);
      })
      .catch((error) => {
        console.error("❌ Socket connection error:", error);
        // Don't set loading to false here - messages might have loaded
      });

    // Listen for new messages
    const handleNewMessage = (message: ChatMessage) => {
      console.log("📩 New message received:", message);
      // Check both orderId and tripId (since backend might send either)
      const messageOrderId = message.orderId || message.tripId;
      if (messageOrderId === orderId) {
        console.log("✅ Message is for this order, adding to list");
        // Check if message already exists (avoid duplicates)
        setMessages((prev) => {
          const exists = prev.some(m => m._id === message._id);
          if (exists) {
            console.log("⚠️ Message already exists, skipping");
            return prev;
          }
          return [...prev, message];
        });
        scrollToBottom();
        // Mark as read immediately
        markOrderMessagesAsRead(orderId);
      } else {
        console.log("⚠️ Message is for different order:", messageOrderId, "vs", orderId);
      }
    };


    // Listen for new messages (backend emits newChatMessage for both trips and orders)
    socketService.onNewMessage(handleNewMessage);
    socketService.onUserTyping((data) => {
    
      if (data.tripId === orderId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userName || 'Someone');
          } else {
            newSet.delete(data.userName || 'Someone');
          }
          return newSet;
        });
      }
    });

    return () => {
      socketService.leaveTripChat(orderId);
      socketService.offNewMessage(handleNewMessage);
      socketService.offUserTyping();
    };
  }, [orderId]);

  // Handle send message
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || sending) return;

    setSending(true);
    try {
      console.log("📤 Sending message:", newMessage);
      const response = await sendChatMessageAPI(orderId, newMessage, selectedFile || undefined);
      console.log("📤 Send response:", response);
      
      if (response.success && response.data) {
        console.log("✅ Message sent successfully:", response.data);
        // Add message to local state immediately (optimistic update)
        setMessages((prev) => [...prev, response.data!]);
        setNewMessage("");
        setSelectedFile(null);
        scrollToBottom();
      } else {
        console.error("❌ Failed to send:", response.message);
        alert(response.message || "Failed to send message");
      }
    } catch (error) {
      console.error("❌ Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    // Backend uses typing event for both trips and orders
    socketService.setTyping(orderId, true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socketService.setTyping(orderId, false);
    }, 1000);
  };

  // Get current user info
  const getCurrentUserId = () => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    return userInfo?.userData?._id || userInfo?.userData?.id || "";
  };

  const currentUserId = getCurrentUserId();

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  // Check if message is read
  const isMessageRead = (message: ChatMessage) => {
    return message.readBy.some((read) => read.userId !== message.senderId._id);
  };

  // Handle file download

  // Handle file view
  const handleFileView = async (message: ChatMessage) => {
    try {
      const response = await getChatMessageFileSignedUrl(message._id, 'inline');
      if (response.success && response.url) {
        window.open(response.url, '_blank');
      }
    } catch (error) {
      console.error("Error viewing file:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="bg-card border-b border-theme px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-[var(--accent-blue)]" />
          <div>
            <h3 className="text-lg font-semibold text-primary">Order Chat</h3>
            <p className="text-sm text-secondary">Order #{orderNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadMessages}
            className="text-secondary hover:text-secondary transition-colors p-2 hover:bg-[rgba(255,255,255,0.03)] rounded"
            title="Refresh messages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-secondary hover:text-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)]"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-secondary">
            <MessageCircle className="w-12 h-12 mb-2" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId._id === currentUserId;
            return (
              <div
                key={message._id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[70%] ${isOwnMessage ? "items-end" : "items-start"} flex flex-col`}>
                  {!isOwnMessage && (
                    <span className="text-xs text-secondary mb-1 px-2">
                      {message.senderName}
                    </span>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isOwnMessage
                        ? "bg-[var(--accent-blue)] text-white"
                        : "bg-card text-primary border border-theme"
                    }`}
                  >
                    {message.message && <p className="text-sm">{message.message}</p>}
                    {message.fileUrl && (
                      <div className="mt-2 pt-2 border-t border-theme">
                        <div className="flex items-center gap-2">
                          {message.fileType === "image" ? (
                            <ImageIcon className="w-4 h-4" />
                          ) : (
                            <File className="w-4 h-4" />
                          )}
                          <button
                            onClick={() => handleFileView(message)}
                            className="text-xs underline hover:no-underline"
                          >
                            {message.fileName || "View file"}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <span className="text-xs opacity-70">{formatTime(message.createdAt)}</span>
                      {isOwnMessage && (
                        <span className="text-xs">
                          {isMessageRead(message) ? (
                            <CheckCheck className="w-3 h-3" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        
        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 text-sm text-secondary px-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
            <span>{Array.from(typingUsers).join(", ")} typing...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-card border-t border-theme p-4">
        {selectedFile && (
          <div className="mb-2 flex items-center gap-2 text-sm text-secondary bg-card p-2 rounded">
            <File className="w-4 h-4" />
            <span className="flex-1 truncate">{selectedFile.name}</span>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-secondary hover:text-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-secondary hover:text-secondary transition-colors"
            disabled={sending}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          />
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent resize-none"
            rows={1}
            disabled={sending}
          />
          <button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !selectedFile) || sending}
            className="p-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderChat;

