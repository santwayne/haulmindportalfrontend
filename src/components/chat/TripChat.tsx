import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Paperclip, X, File, Image as ImageIcon, Check, CheckCheck } from "lucide-react";
import { socketService } from "../../services/socketService";
import {
  getTripChatMessages,
  sendChatMessage as sendChatMessageAPI,
  markMessagesAsRead,
  getChatMessageFileSignedUrl,
  type ChatMessage,
} from "../../axios/api/chat";

interface TripChatProps {
  tripId: string;
  tripNumber: string;
  onClose?: () => void;
}

const TripChat: React.FC<TripChatProps> = ({ tripId, tripNumber, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
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
      const response = await getTripChatMessages(tripId, 1, 100);
      if (response.success && response.data) {
        setMessages(response.data.messages || []);
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize socket and load messages
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return;
    }

    // Connect and authenticate socket
    socketService
      .connect(token)
      .then(() => {
        // Join trip chat room
        return socketService.joinTripChat(tripId);
      })
      .then(() => {
        // Load messages
        loadMessages();
        // Mark messages as read
        markMessagesAsRead(tripId);
      })
      .catch((error) => {
        console.error("Socket connection error:", error);
      });

    // Listen for new messages
    const handleNewMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
      // Mark as read if it's not from current user
      if (message.senderId._id !== localStorage.getItem("userId")) {
        markMessagesAsRead(tripId);
      }
    };

    // Listen for typing indicators
    const handleTyping = (data: {
      userId: string;
      userName: string;
      tripId: string;
      isTyping: boolean;
    }) => {
      if (data.tripId === tripId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userName);
          } else {
            newSet.delete(data.userName);
          }
          return newSet;
        });
      }
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.onUserTyping(handleTyping);

    // Cleanup
    return () => {
      socketService.offNewMessage(handleNewMessage);
      socketService.offUserTyping(handleTyping);
      socketService.leaveTripChat(tripId);
    };
  }, [tripId]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    try {
      setSending(true);

      // If file is selected, use HTTP API
      if (selectedFile) {
        setUploadingFile(true);
        const response = await sendChatMessageAPI(tripId, newMessage, selectedFile);
        if (response.success && response.data) {
          setMessages((prev) => [...prev, response.data!]);
          setNewMessage("");
          setSelectedFile(null);
          scrollToBottom();
        }
        setUploadingFile(false);
      } else {
        // Send via socket for real-time
        socketService.sendChatMessage({
          tripId,
          message: newMessage,
        });
        setNewMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
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
    socketService.setTyping(tripId, true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socketService.setTyping(tripId, false);
    }, 2000);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  };



  // Format time for message
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  // Group messages by date
  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {};
    messages.forEach((message) => {
      const date = new Date(message.createdAt);
      const dateKey = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    return groups;
  };

  // Get current user ID and role
  const getCurrentUserInfo = () => {
    try {
      const userInfo = localStorage.getItem("userInfo");
      if (userInfo) {
        const parsed = JSON.parse(userInfo);
        if (parsed?.userData) {
          return {
            userId: parsed.userData._id || parsed.userData.id,
            role: parsed.userData.role,
          };
        }
      }
      const superAdminInfo = localStorage.getItem("superAdminInfo");
      if (superAdminInfo) {
        const parsed = JSON.parse(superAdminInfo);
        if (parsed?.userData) {
          return {
            userId: parsed.userData._id || parsed.userData.id,
            role: parsed.userData.role,
          };
        }
      }
      const userId = localStorage.getItem("userId");
      return { userId, role: null };
    } catch (e) {
      const userId = localStorage.getItem("userId");
      return { userId, role: null };
    }
  };

  const currentUserInfo = getCurrentUserInfo();
  const currentUserId = currentUserInfo.userId;


  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 min-h-0">
      {/* Modern Header */}
      <div className="flex-shrink-0 text-white shadow-lg" style={{ background: '#00C2A6' }}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-card/20 rounded-lg backdrop-blur-sm">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Trip Chat</h3>
              <p className="text-sm text-blue-100">{tripNumber}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-card/20 rounded-lg transition-all duration-200 group"
            >
              <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0 bg-card" style={{ maxHeight: '100%' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
              <p className="text-secondary">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-[#00D1FF]" />
              </div>
              <p className="text-primary font-semibold text-lg mb-1">No messages yet</p>
              <p className="text-sm text-secondary">Start the conversation with the driver!</p>
            </div>
          </div>
        ) : (
          Object.entries(messageGroups).map(([dateKey, dateMessages]) => (
            <div key={dateKey}>
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-card px-4 py-1 rounded-full shadow-sm border border-theme">
                  <span className="text-xs font-medium text-secondary">{dateKey}</span>
                </div>
              </div>

              {/* Messages for this date */}
              {dateMessages.map((message, index) => {
                const senderType = message.senderType || '';
                const isRightSide = senderType === 'dispatcher' || senderType === 'admin';
                const isCurrentUser = currentUserId && String(message.senderId._id) === String(currentUserId);
                const showAvatar = index === 0 || dateMessages[index - 1].senderId._id !== message.senderId._id;
                const isRead = message.readBy && message.readBy.length > 0;

                return (
                  <div
                    key={message._id}
                    className={`flex items-end gap-2 mb-3 ${isRightSide ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    {!isRightSide && showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {message.senderName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {!isRightSide && !showAvatar && <div className="w-8 flex-shrink-0" />}

                    {/* Message Bubble */}
                    <div className={`flex flex-col ${isRightSide ? "items-end" : "items-start"} max-w-[75%]`}>
                      {!isRightSide && showAvatar && (
                        <span className="text-xs font-medium text-secondary mb-1 px-1">
                          {message.senderName}
                        </span>
                      )}

                      <div
                        className={`relative rounded-2xl px-4 py-2.5 shadow-md ${isRightSide
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm"
                            : "bg-card text-primary border border-theme rounded-tl-sm"
                          }`}
                      >
                        {/* Message Text */}
                        {message.message && (
                          <p className={`text-sm leading-relaxed ${isRightSide ? "text-white" : "text-primary"}`}>
                            {message.message}
                          </p>
                        )}

                        {/* File Attachment */}
                        {message.fileUrl && (
                          <div className={`mt-2 ${message.message ? "pt-2 border-t" : ""} ${isRightSide ? "border-blue-400/30" : "border-theme"
                            }`}>
                            <button
                              onClick={async (e) => {
                                e.preventDefault();
                                try {
                                  const response = await getChatMessageFileSignedUrl(message._id, 'inline');
                                  if (response.success && response.url) {
                                    window.open(response.url, '_blank');
                                  } else {
                                    window.open(message.fileUrl, '_blank');
                                  }
                                } catch (error) {
                                  console.error('Error opening file:', error);
                                  window.open(message.fileUrl, '_blank');
                                }
                              }}
                              className={`flex items-center gap-2 p-2 rounded-lg transition-all hover:opacity-80 ${isRightSide
                                  ? "bg-card/20 hover:bg-card/30 text-white"
                                  : "bg-card hover:bg-gray-200 text-[#00D1FF]"
                                }`}
                            >
                              {message.fileType === "image" ? (
                                <ImageIcon className="w-4 h-4" />
                              ) : (
                                <File className="w-4 h-4" />
                              )}
                              <span className="text-xs font-medium flex-1 text-left">
                                {message.fileName || "File"}
                              </span>
                              {message.fileSize && (
                                <span className={`text-xs ${isRightSide ? "text-blue-100" : "text-secondary"}`}>
                                  {formatFileSize(message.fileSize)}
                                </span>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Message Footer */}
                        <div className={`flex items-center gap-1.5 mt-1.5 ${isRightSide ? "justify-end" : "justify-start"}`}>
                          <span className={`text-xs ${isRightSide ? "text-blue-100" : "text-secondary"}`}>
                            {formatTime(message.createdAt)}
                          </span>
                          {isRightSide && isCurrentUser && (
                            <div className="flex items-center">
                              {isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-blue-200" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            </div>
            <div className="bg-card rounded-2xl rounded-tl-sm px-4 py-3 shadow-md border border-theme">
              <div className="flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-secondary ml-2">
                  {Array.from(typingUsers).join(", ")} typing...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="flex-shrink-0 px-4 py-3 bg-card border-t border-theme flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-blue-100 rounded-lg">
              <File className="w-4 h-4 text-[#00D1FF]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary truncate">{selectedFile.name}</p>
              <p className="text-xs text-secondary">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="p-2 text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modern Input Area */}
      <div className="flex-shrink-0 p-4 bg-card border-t border-theme shadow-lg">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,application/pdf,.doc,.docx"
        />
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-secondary hover:text-[#00D1FF] hover:bg-blue-50 rounded-lg transition-all duration-200 flex-shrink-0"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
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
              className="w-full px-4 py-3 border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-card text-primary placeholder-gray-400 transition-all"
              rows={1}
              style={{ maxHeight: "120px" }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={sending || uploadingFile || (!newMessage.trim() && !selectedFile)}
            className="p-2.5  !text-white rounded-xl  disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg flex-shrink-0 disabled:hover:shadow-md"
            style={{ background: '#00C2A6' }}
            title="Send message"
          >
            {sending || uploadingFile ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripChat;
