import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Paperclip, X, File, Image as ImageIcon, Check, CheckCheck, Search, Phone, PhoneOff, PhoneIncoming, PhoneOutgoing, PhoneMissed, Mic, MicOff, Minimize2, Volume2 } from "lucide-react";
import { socketService } from "../../services/socketService";
import { listDriver } from "../../axios/api/distapcher";
import {
  getDriverChatMessages,
  sendDriverChatMessage as sendDriverChatMessageAPI,
  markDriverMessagesAsRead,
  getChatMessageFileSignedUrl,
  getDriversLastMessages,
  type ChatMessage,
} from "../../axios/api/chat";
import { useChat } from "../../contexts/ChatContext";
import { useCall } from "../../contexts/CreateCallContext";



interface Driver {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  profileImageUrl?: string;
  status?: string;
}

interface DriverChatProps {
  onClose?: () => void;
}



const callRecordPreview = (text: string): string => {
  if (!text?.startsWith('{"__callRecord"')) return text;
  try {
    const rec = JSON.parse(text);
    if (!rec.__callRecord) return text;
    const dur = rec.duration || 0;
    const durStr = dur > 0
      ? ` · ${String(Math.floor(dur / 60)).padStart(2, '0')}:${String(dur % 60).padStart(2, '0')}`
      : '';
    if (rec.type === 'ended')     return `📞 ${rec.initiatedBy === 'dispatcher' ? 'Outgoing' : 'Incoming'} call${durStr}`;
    if (rec.type === 'cancelled') return `📞 ${rec.initiatedBy === 'dispatcher' ? 'You cancelled' : 'Driver cancelled'}`;
    if (rec.type === 'declined')  return `📞 ${rec.initiatedBy === 'dispatcher' ? 'Driver declined' : 'You declined'}`;
    return '📞 Missed call';
  } catch { return text; }
};

const DriverChat: React.FC<DriverChatProps> = ({ onClose }) => {
  // Restore drivers list from cache → renders immediately on every mount
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    try {
      const cached = sessionStorage.getItem('driverChatDrivers');
      if (cached) return JSON.parse(cached);
    } catch { /* ignore */ }
    return [];
  });
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  // Only show loading spinner when no cached data exists
  const [driversLoading, setDriversLoading] = useState(() => {
    try { return !sessionStorage.getItem('driverChatDrivers'); } catch { return true; }
  });
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Restore lastMessages from cache → list renders sorted immediately on every mount
  const [lastMessages, setLastMessages] = useState<Record<string, { text: string; time: Date; senderType?: string }>>(() => {
    try {
      const cached = sessionStorage.getItem('driverChatLastMessages');
      if (cached) {
        const parsed = JSON.parse(cached);
        const result: Record<string, { text: string; time: Date; senderType?: string }> = {};
        for (const [id, val] of Object.entries(parsed as any)) {
          result[id] = { ...(val as any), time: new Date((val as any).time) };
        }
        return result;
      }
    } catch { /* ignore */ }
    return {};
  });

  const {
    callState,
    isMuted, isMinimized, callSeconds,
    setIsOnChatPage, setIsMinimized,
    startCall, acceptCall, endCall, rejectCall, toggleMute,
  } = useCall();

  // Track whether the call was connected before transitioning to "declined"
  // so we can show "Call Ended" vs "Call Declined" correctly.
  const prevCallStateRef = useRef(callState);
  useEffect(() => { prevCallStateRef.current = callState; }, [callState]);

  // Persist both caches whenever they change
  useEffect(() => {
    try { sessionStorage.setItem('driverChatLastMessages', JSON.stringify(lastMessages)); } catch { /* ignore */ }
  }, [lastMessages]);
  useEffect(() => {
    try { sessionStorage.setItem('driverChatDrivers', JSON.stringify(drivers)); } catch { /* ignore */ }
  }, [drivers]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedDriverRef = useRef<Driver | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const formatCallTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Mark chat page active so GlobalCallHandler defers its full-screen overlay to us
  useEffect(() => {
    setIsOnChatPage(true);
    return () => setIsOnChatPage(false);
  }, [setIsOnChatPage]);

  const { setActiveDriverId } = useChat();

  useEffect(() => {
    if (selectedDriver) {
      setActiveDriverId(selectedDriver._id);
    }

    return () => {
      setActiveDriverId(null);
    };
  }, [selectedDriver]);

  // Load drivers list and last messages concurrently, silently refresh if cache exists
  const loadDrivers = async () => {
    try {
      const hasCached = drivers.length > 0;
      if (!hasCached) setDriversLoading(true);
      const [driversResponse, lastMsgsResponse] = await Promise.all([
        listDriver({ page: 1, limit: 100, status: 'all' }),
        getDriversLastMessages(),
      ]);

      // Parse last messages first so drivers render already sorted
      if (lastMsgsResponse.success && lastMsgsResponse.data) {
        const counts: Record<string, number> = {};
        const lasts: Record<string, { text: string; time: Date; senderType?: string }> = {};
        for (const item of lastMsgsResponse.data) {
          if (!item.driverId) continue;
          const id = item.driverId.toString();
          counts[id] = item.unreadCount || 0;
          if (item.lastMessage) {
            lasts[id] = {
              text: callRecordPreview(item.lastMessage.message) || (item.lastMessage.fileUrl ? '📎 File' : ''),
              time: new Date(item.lastMessage.createdAt),
              senderType: item.lastMessage.senderType,
            };
          }
        }
        setUnreadCounts(counts);
        setLastMessages(lasts);
      }

      if (driversResponse?.success) {
        let driverList: Driver[] = [];
        if (Array.isArray(driversResponse.data)) {
          driverList = driversResponse.data;
        } else if (driversResponse.data?.data && Array.isArray(driversResponse.data.data)) {
          driverList = driversResponse.data.data;
        } else if (driversResponse.data?.drivers && Array.isArray(driversResponse.data.drivers)) {
          driverList = driversResponse.data.drivers;
        }
        setDrivers(driverList);
      }
    } catch (error) {
      console.error("Error loading drivers:", error);
    } finally {
      setDriversLoading(false);
    }
  };

  // Load fresh data on every mount — independent of socket so it always runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadDrivers(); }, []);

  // Load messages for selected driver
  const loadMessages = async (driverId: string) => {

    try {
      setLoading(true);
      const response = await getDriverChatMessages(driverId, 1, 100);


      if (response.success && response.data) {
        const msgs: ChatMessage[] = response.data.messages || [];
        setMessages(msgs);
        // Populate last message for sidebar preview
        const realMsgs = msgs.filter(m => !m.isSystemMessage && m.senderType !== 'system');
        if (realMsgs.length > 0) {
          const last = realMsgs[realMsgs.length - 1];
          setLastMessages(prev => ({
            ...prev,
            [driverId]: {
              text: callRecordPreview(last.message) || (last.fileUrl ? '📎 File' : ''),
              time: new Date((last as any).createdAt || Date.now()),
              senderType: last.senderType
            }
          }));
        }
        scrollToBottom();
      } else {
        // If response is not successful or no data, set empty messages
        setMessages([]);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Get current user ID
  const getCurrentUserInfo = () => {
    try {
      const userInfo = localStorage.getItem("userInfo");
      if (userInfo) {
        const parsed = JSON.parse(userInfo);
        if (parsed?.userData) {
          return {
            userId: parsed.userData._id || parsed.userData.id,
            role: parsed.userData.role,
            name: parsed.userData.name || 'You',
            email: parsed.userData.email || '',
          };
        }
      }
      const userId = localStorage.getItem("userId");
      const userName = localStorage.getItem("userName") || 'You';
      const userEmail = localStorage.getItem("userEmail") || '';
      return { userId, role: null, name: userName, email: userEmail };
    } catch (e) {
      const userId = localStorage.getItem("userId");
      const userName = localStorage.getItem("userName") || 'You';
      const userEmail = localStorage.getItem("userEmail") || '';
      return { userId, role: null, name: userName, email: userEmail };
    }
  };

  const currentUserId = getCurrentUserInfo().userId;

  // Update refs when selectedDriver or messages change
  useEffect(() => {
    selectedDriverRef.current = selectedDriver;
  }, [selectedDriver]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Initialize socket and load drivers
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return;
    }

    // Listen for new messages - use refs to always have current values
    // Set up listener first so it's ready when socket connects
    const handleNewMessage = (message: ChatMessage) => {
      // Get current values from refs
      console.log("...................handleNew message......................")
      const currentSelectedDriver = selectedDriverRef.current;
      const currentMessages = messagesRef.current;

      console.log("current message", currentMessages)

      console.log("📨 New message received in driver chat:", {
        messageId: message._id,
        driverId: message.driverId,
        driverIdType: typeof message.driverId,
        senderId: message.senderId,
        senderIdType: typeof message.senderId,
        selectedDriverId: currentSelectedDriver?._id,
        selectedDriverName: currentSelectedDriver?.name,
        hasSelectedDriver: !!currentSelectedDriver,
        message: message.message?.substring(0, 50),
        senderType: message.senderType,
        isSystemMessage: message.isSystemMessage,
        hasTripStatus: !!message.tripStatus,
        tripStatusSummary: message.tripStatus?.summary,
        forDispatchersOnly: message.forDispatchersOnly,
        isTempMessage: message._id?.startsWith('temp-'),
        currentMessagesCount: currentMessages.length
      });



      // Extract driverId from message (handle both object and string formats)
      let driverIdStr: string = '';

      if (message.driverId) {
        console.log("message from driver", message.driverId);
        console.log("message", message)
        if (typeof message.driverId === 'object') {
          // Handle ObjectId or populated object
          driverIdStr = message.driverId._id?.toString() ||
            message.driverId.toString() ||
            String(message.driverId);

        } else {
          driverIdStr = String(message.driverId);
        }
      }



      // Normalize selected driver ID for comparison
      const selectedDriverIdStr = currentSelectedDriver?._id?.toString() || currentSelectedDriver?._id;


      const currentUserIdStr = currentUserId?.toString();

      console.log("currentUserIdStr", currentUserIdStr)

      // System messages with trip status should always be shown if driverId matches
      const isSystemMessage = message.isSystemMessage || message.senderType === 'system';

      console.log("...................issystemMessage...............");
      console.log(isSystemMessage)

      console.log("🔍 Comparing driver IDs:", {
        messageDriverId: driverIdStr,
        selectedDriverId: selectedDriverIdStr,
        match: driverIdStr === selectedDriverIdStr,
        isSystemMessage: isSystemMessage,
        hasTripStatus: !!message.tripStatus,
        senderType: message.senderType,
        messageId: message._id?.substring(0, 20)
      });

      // Only add message if it's for the currently selected driver
      // For system messages, we still need driverId to match
      // If no driver is selected, we'll just update unread counts


      // Always update last message for this driver (for sidebar preview + sorting)
      if (driverIdStr && !message.isSystemMessage && message.senderType !== 'system') {
        setLastMessages(prev => ({
          ...prev,
          [driverIdStr]: {
            text: callRecordPreview(message.message) || (message.fileUrl ? '📎 File' : ''),
            time: new Date(message.createdAt || Date.now()),
            senderType: message.senderType
          }
        }));
      }

      // if this is true chat open
      if (currentSelectedDriver && driverIdStr && driverIdStr === selectedDriverIdStr) {

        console.log("currentSelectedDriver", currentSelectedDriver)
        console.log("driverIdStr", driverIdStr)
        console.log("selectedDriverIdStr", selectedDriverIdStr)
        console.log("12345678910")
        console.log("✅ Adding message to chat for selected driver", {
          isSystemMessage: isSystemMessage,
          hasTripStatus: !!message.tripStatus,
          messageId: message._id,
          driverIdMatch: driverIdStr === selectedDriverIdStr
        });

        // System messages should always be added (they're not from current user)
        if (isSystemMessage && message.tripStatus) {
          // Check if system message already exists
          const exists = currentMessages.some((msg) => msg._id === message._id);
          if (exists) {
            console.log("⚠️ System message already exists, skipping duplicate");
            return;
          }
          console.log("✅ Adding system message with trip status", {
            tripStatusSummary: message.tripStatus?.summary,
            activeOrders: message.tripStatus?.activeOrders?.length,
            activeTrips: message.tripStatus?.activeTrips?.length,
            totalActive: message.tripStatus?.summary?.totalActive,
            totalPending: message.tripStatus?.summary?.totalPending,
            isCurrentlyDriving: message.tripStatus?.summary?.isCurrentlyDriving,
            messageId: message._id
          });
          setMessages((prev) => {
            const updated = [...prev, message];
            messagesRef.current = updated;
            console.log("📝 Updated messages array:", {
              newLength: updated.length,
              lastMessageId: updated[updated.length - 1]?._id,
              lastMessageType: updated[updated.length - 1]?.senderType,
              lastMessageHasTripStatus: !!updated[updated.length - 1]?.tripStatus
            });
            return updated;
          });
          scrollToBottom();
          return;
        }

        // Check if this is a real message that should replace an optimistic message
        const senderId = typeof message.senderId === 'object'
          ? message.senderId._id?.toString() || message.senderId.toString()
          : message.senderId?.toString();

        console.log("..................senderId............", senderId)


        // If this message is from current user, check if we have an optimistic message to replace
        if (senderId === currentUserIdStr) {
          console.log("sendId is equal to currentUserIdStr");
          console.log("📨 Received real message from dispatcher (current user), replacing optimistic message", {
            messageId: message._id,
            messageText: message.message?.substring(0, 50),
            senderId: senderId,
            currentUserId: currentUserIdStr,
            hasOptimistic: currentMessages.some(msg => msg._id.startsWith('temp-'))
          });



          setMessages((prev) => {
            // Check if real message already exists
            const realExists = prev.some(msg => msg._id === message._id);
            if (realExists) {
              console.log("⚠️ Real message already exists, skipping duplicate");
              return prev; // Don't add duplicate
            }

            // Remove any optimistic messages from current user (remove all temp messages from this user)
            // This ensures we replace optimistic messages even if content doesn't match exactly
            let removedCount = 0;
            const filtered = prev.filter(msg => {
              if (msg._id.startsWith('temp-')) {
                const optimisticSenderId = typeof msg.senderId === 'object'
                  ? msg.senderId._id?.toString() || msg.senderId.toString()
                  : msg.senderId?.toString();
                if (optimisticSenderId === currentUserIdStr) {
                  removedCount++;
                  console.log("🔄 Removing optimistic message:", msg._id, "Message:", msg.message?.substring(0, 30));
                  return false; // Remove optimistic message
                }
              }
              return true;
            });

            // Add the real message
            console.log(`✅ Adding real message from dispatcher (removed ${removedCount} optimistic), total messages:`, filtered.length + 1);
            const updated = [...filtered, message];
            // Update ref immediately
            messagesRef.current = updated;
            return updated;
          });
          scrollToBottom();
        } else {
          // Message from other user (driver or system), check if it already exists
          // Normalize message ID for comparison
          const messageId = typeof message._id === 'object' ? message._id.toString() : String(message._id);
          const exists = currentMessages.some((msg) => {
            const msgId = typeof msg._id === 'object' ? msg._id.toString() : String(msg._id);
            return msgId === messageId;
          });

          if (exists) {
            console.log("⚠️ Message already exists, skipping duplicate", {
              messageId: messageId,
              messageText: message.message?.substring(0, 30)
            });
            return; // Don't add duplicate
          }

          // Message from other user or system, just add it
          console.log("✅ Adding new message from other user", {
            messageId: messageId,
            senderType: message.senderType,
            isSystemMessage: message.isSystemMessage,
            hasTripStatus: !!message.tripStatus,
            senderId: senderId,
            currentUserId: currentUserIdStr
          });
          setMessages((prev) => {
            // Double-check for duplicates before adding
            const msgId = typeof message._id === 'object' ? message._id.toString() : String(message._id);
            const stillExists = prev.some((msg) => {
              const existingMsgId = typeof msg._id === 'object' ? msg._id.toString() : String(msg._id);
              return existingMsgId === msgId;
            });



            if (stillExists) {
              console.log("⚠️ Duplicate detected in setMessages, skipping");
              return prev;
            }

            const updated = [...prev, message];
            // Update ref immediately
            messagesRef.current = updated;
            console.log("📝 Added message from other user, total messages:", updated.length);
            return updated;
          });
          scrollToBottom();
        }



        // Mark as read if it's not from current user
        if (senderId && senderId !== currentUserIdStr && currentSelectedDriver) {
          console.log("senderId", senderId);
          console.log("currentUserIdStr", currentUserIdStr);
          console.log("currentSelectedDriver", currentSelectedDriver);
          markDriverMessagesAsRead(currentSelectedDriver._id);
        }

      } else if (driverIdStr) {
        console.log("12345678910")


        // Message is for a different driver or no driver selected
        if (isSystemMessage && message.tripStatus) {
          console.log("⚠️ System message received but driverId doesn't match selected driver or no driver selected", {
            messageDriverId: driverIdStr,
            selectedDriverId: selectedDriverIdStr,
            hasSelectedDriver: !!currentSelectedDriver
          });
        }
        // Update unread count for the driver (if not currently viewing)
        console.log(`📬 Updating unread count for driver: ${driverIdStr}`);
        setUnreadCounts((prev) => ({
          ...prev,
          [driverIdStr]: (prev[driverIdStr] || 0) + 1,
        }));
      } else {
        console.log("⚠️ Message has no driverId, skipping", {
          messageId: message._id,
          senderType: message.senderType,
          isSystemMessage: isSystemMessage
        });
      }
    };

    // Listen for typing indicators - use ref for current selectedDriver
    const handleTyping = (data: {
      userId: string;
      userName: string;
      driverId?: string;
      tripId?: string;
      orderId?: string;
      isTyping: boolean;
    }) => {
      const currentSelectedDriver = selectedDriverRef.current;
      // Only handle driver chat typing indicators
      if (currentSelectedDriver && data.driverId && data.driverId === currentSelectedDriver._id) {
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

    // Register listeners first (before connect resolves so no messages are missed)
    socketService.onNewMessage(handleNewMessage);
    socketService.onUserTyping(handleTyping);

    // Connect (reuses existing socket if same token — won't destroy listeners)
    socketService
      .connect(token)
      .catch((error) => {
        console.error("Socket connection error:", error);
      });

    // Cleanup
    return () => {
      socketService.offNewMessage(handleNewMessage);
      socketService.offUserTyping(handleTyping);
      const currentSelectedDriver = selectedDriverRef.current;
      if (currentSelectedDriver) {
        socketService.leaveDriverChat(currentSelectedDriver._id);
      }
    };
  }, [currentUserId]); // Only depend on currentUserId, not selectedDriver

  // Handle driver selection
  useEffect(() => {
    if (selectedDriver) {
      console.log(`🔄 Driver selected: ${selectedDriver._id} (${selectedDriver.name})`);
      // Reset messages and set loading when driver changes
      setMessages([]);
      setLoading(true);

      // Join driver chat room
      const driverIdStr = selectedDriver._id?.toString() || selectedDriver._id;
      socketService
        .joinDriverChat(driverIdStr)
        .then(() => {
          console.log(`✅ Joined driver chat room for driver: ${driverIdStr}`);
          loadMessages(driverIdStr);
          markDriverMessagesAsRead(driverIdStr);
          // Clear unread count for this driver
          setUnreadCounts((prev) => ({
            ...prev,
            [driverIdStr]: 0,
          }));
        })
        .catch((error) => {
          console.error("❌ Error joining driver chat:", error);
          // Still try to load messages even if socket join fails
          loadMessages(driverIdStr);
        });

      // Leave room when driver changes or component unmounts
      return () => {
        socketService.leaveDriverChat(driverIdStr);
      };
    } else {
      // No driver selected, clear messages and loading
      setMessages([]);
      setLoading(false);
    }
  }, [selectedDriver]);



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

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  const handleStartCall = () => {
    if (!selectedDriver || callState !== "idle") return;
    startCall(selectedDriver._id, selectedDriver.name);
  };



  // Handle send message
  const handleSendMessage = async () => {
    if (!selectedDriver || (!newMessage.trim() && !selectedFile)) return;

    const messageText = newMessage.trim();
    const fileToSend = selectedFile;

    try {
      setSending(true);

      // If file is selected, use HTTP API
      if (fileToSend) {
        setUploadingFile(true);
        const response = await sendDriverChatMessageAPI(selectedDriver._id, messageText, fileToSend);
        if (response.success && response.data) {
          setMessages((prev) => [...prev, response.data!]);
          setNewMessage("");
          setSelectedFile(null);
          scrollToBottom();
        }
        setUploadingFile(false);
      } else {
        // Create optimistic message for immediate display
        const optimisticMessage: ChatMessage = {
          _id: `temp-${Date.now()}-${Math.random()}`,
          driverId: selectedDriver._id,
          senderId: {
            _id: currentUserId || '',
            name: getCurrentUserInfo().name || 'You',
            email: getCurrentUserInfo().email || '',
          },
          senderType: 'dispatcher',
          senderName: getCurrentUserInfo().name || 'You',
          message: messageText,
          readBy: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Add optimistic message immediately for instant feedback
        setMessages((prev) => {
          const updated = [...prev, optimisticMessage];
          // Update ref immediately so handleNewMessage can access it
          messagesRef.current = updated;
          console.log("✅ Added optimistic message, total messages:", updated.length);
          return updated;
        });
        setNewMessage("");
        scrollToBottom();

        // Send via socket for real-time
        // The backend will emit the message back via socket, which will be caught by handleNewMessage
        // The real message will replace the optimistic one (or we'll remove the optimistic one if it matches)
        console.log("📤 Sending message via socket to driver:", selectedDriver._id);
        socketService.sendDriverChatMessage({
          driverId: selectedDriver._id,
          message: messageText,
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      if (!fileToSend) {
        setMessages((prev) => prev.filter(msg => !msg._id.startsWith('temp-')));
      }
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
    if (!selectedDriver) return;
    socketService.setDriverTyping(selectedDriver._id, true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socketService.setDriverTyping(selectedDriver._id, false);
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

  // Format timestamp for sidebar (WhatsApp-style)
  const formatSidebarTime = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (msgDay.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } else if (msgDay.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else if (now.getTime() - date.getTime() < 7 * 86400000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
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

  // Filter and sort drivers — most recent message first (WhatsApp-style)
  const filteredDrivers = drivers
    .filter((driver) =>
      driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone?.includes(searchQuery)
    )
    .sort((a, b) => {
      const aUnread = unreadCounts[a._id] || 0;
      const bUnread = unreadCounts[b._id] || 0;
      // Drivers with unread messages float to top
      if (aUnread > 0 && bUnread === 0) return -1;
      if (bUnread > 0 && aUnread === 0) return 1;
      // Then sort by most recent message time
      const aTime = lastMessages[a._id]?.time?.getTime() || 0;
      const bTime = lastMessages[b._id]?.time?.getTime() || 0;
      return bTime - aTime;
    });

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex h-full bg-card relative">

      {/* Drivers List Sidebar — WhatsApp style */}
      <div className="w-72 flex flex-col bg-card border-r border-theme">
        {/* Header */}
        <div className="px-3 pt-3 pb-2 border-b border-theme bg-accent">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              Drivers
              {Object.values(unreadCounts).reduce((s, n) => s + n, 0) > 0 && (
                <span className="bg-card text-[var(--accent-navyblue)] text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {Object.values(unreadCounts).reduce((s, n) => s + n, 0)}
                </span>
              )}
            </h2>
            {onClose && (
              <button onClick={onClose} className="p-1 hover:bg-card/20 rounded transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-card/15 text-white placeholder-white/60 border border-white/25 rounded-lg focus:outline-none focus:bg-card/25"
            />
          </div>
        </div>

        {/* Drivers List */}
        <div className="flex-1 overflow-y-auto bg-card">
          {filteredDrivers.length === 0 && !driversLoading ? (
            <div className="p-4 text-center text-secondary text-xs">No drivers found</div>
          ) : (
            <div>
              {filteredDrivers.map((driver) => {
                const isSelected = selectedDriver?._id === driver._id;
                const unreadCount = unreadCounts[driver._id] || 0;
                const lastMsg = lastMessages[driver._id];
                return (
                  <button
                    key={driver._id}
                    onClick={() => setSelectedDriver(driver)}
                    className={`w-full px-3 py-2.5 text-left transition-colors border-b border-gray-50 ${isSelected ? 'bg-card border-l-2 border-l-[var(--accent-navyblue)]' : 'hover:bg-[rgba(255,255,255,0.03)]'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {driver.profileImageUrl ? (
                          <img src={driver.profileImageUrl} alt={driver.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: '#1976D2' }}>
                            {driver.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {driver.status === 'active' && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-[var(--accent-navyblue)]' : 'text-primary'}`}>
                            {driver.name}
                          </p>
                          {lastMsg && (
                            <span className={`text-[10px] flex-shrink-0 whitespace-nowrap ${unreadCount > 0 ? 'text-[var(--accent-navyblue)] font-semibold' : 'text-secondary'}`}>
                              {formatSidebarTime(lastMsg.time)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          {lastMsg ? (
                            <p className={`text-[11px] truncate leading-tight flex-1 ${unreadCount > 0 ? 'text-primary font-medium' : 'text-secondary'}`}>
                              {lastMsg.senderType !== 'driver' && !lastMsg.text?.startsWith('📞') && <span className="text-secondary">You: </span>}
                              {lastMsg.text || '📎 File'}
                            </p>
                          ) : (
                            <p className="text-[11px] text-secondary truncate leading-tight flex-1 italic">No messages yet</p>
                          )}
                          {unreadCount > 0 && (
                            <span className="text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0" style={{ background: '#1976D2' }}>
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedDriver ? (
          <>
            {/* Chat Header */}
            <div className="flex-shrink-0 text-white shadow-sm px-4 py-2.5" style={{ background: '#1976D2' }}>
              <div className="flex items-center gap-2.5 justify-between">

                {selectedDriver.profileImageUrl ? (
                  <img src={selectedDriver.profileImageUrl} alt={selectedDriver.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-card/20 flex items-center justify-center text-white font-bold text-sm">
                    {selectedDriver.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm leading-tight">{selectedDriver.name}</h3>
                  {selectedDriver.phone && (
                    <p className="text-xs text-white/70 leading-tight">{selectedDriver.phone}</p>
                  )}
                </div>
                {callState === "connected" ? (
                  <button onClick={() => endCall()} className="p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors" title="End call">
                    <PhoneOff className="w-4 h-4 text-white" />
                  </button>
                ) : (
                  <button
                    onClick={handleStartCall}
                    disabled={callState !== "idle"}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors disabled:opacity-50"
                    title="Call driver"
                  >
                    <Phone className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0 bg-card">
              {loading ? (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-navyblue)] mb-3"></div>
                    <p className="text-secondary">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-[var(--accent-navyblue)]" />
                    </div>
                    <p className="text-primary font-semibold text-lg mb-1">No messages yet</p>
                    <p className="text-sm text-secondary">Start the conversation with {selectedDriver.name}!</p>
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
                      const isSystemMessage = message.isSystemMessage || senderType === 'system';
                      const isRightSide = (senderType === 'dispatcher' || senderType === 'admin') && !isSystemMessage;
                      const isCurrentUser = currentUserId && String(message.senderId._id) === String(currentUserId);
                      const showAvatar = !isSystemMessage && (index === 0 || dateMessages[index - 1].senderId._id !== message.senderId._id);
                      const isRead = message.readBy && message.readBy.length > 0;

                      // ── Call record messages ─────────────────────────────
                      if (message.message?.startsWith('{"__callRecord"')) {
                        let rec: any = null;
                        try { rec = JSON.parse(message.message); } catch {}
                        if (rec?.__callRecord) {
                          const durSecs = rec.duration || 0;
                          const durStr = durSecs > 0
                            ? `${String(Math.floor(durSecs / 60)).padStart(2, '0')}:${String(durSecs % 60).padStart(2, '0')}`
                            : '';
                          // dispatcher = "you"; driver = the other party
                          const byDispatcher = rec.initiatedBy === 'dispatcher';
                          const byDriver     = rec.initiatedBy === 'driver';
                          let label = '';
                          let IconEl: React.ReactNode;
                          let colorClass = '';
                          let bgClass = '';
                          if (rec.type === 'ended') {
                            label = byDispatcher ? `Outgoing call${durStr ? ' · ' + durStr : ''}` : byDriver ? `Incoming call${durStr ? ' · ' + durStr : ''}` : `Call ended${durStr ? ' · ' + durStr : ''}`;
                            IconEl = byDispatcher ? <PhoneOutgoing className="w-3 h-3 flex-shrink-0" /> : byDriver ? <PhoneIncoming className="w-3 h-3 flex-shrink-0" /> : <Phone className="w-3 h-3 flex-shrink-0" />;
                            colorClass = 'text-green-600'; bgClass = 'bg-green-500/10 border-green-500/20';
                          } else if (rec.type === 'cancelled') {
                            label = byDispatcher ? 'You cancelled' : byDriver ? 'Driver cancelled' : 'Call cancelled';
                            IconEl = byDispatcher ? <PhoneOutgoing className="w-3 h-3 flex-shrink-0" /> : <PhoneIncoming className="w-3 h-3 flex-shrink-0" />;
                            colorClass = 'text-gray-400'; bgClass = 'bg-gray-500/10 border-gray-500/20';
                          } else if (rec.type === 'declined') {
                            label = byDispatcher ? 'Driver declined' : byDriver ? 'You declined' : 'Call declined';
                            IconEl = <PhoneMissed className="w-3 h-3 flex-shrink-0" />;
                            colorClass = 'text-red-500'; bgClass = 'bg-red-500/10 border-red-500/20';
                          } else {
                            label = 'Missed call';
                            IconEl = <PhoneMissed className="w-3 h-3 flex-shrink-0" />;
                            colorClass = 'text-red-500'; bgClass = 'bg-red-500/10 border-red-500/20';
                          }
                          const timeStr = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={message._id} className="flex flex-col items-center my-3 gap-1">
                              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border ${colorClass} ${bgClass}`}>
                                {IconEl}
                                <span>{label}</span>
                              </div>
                              <span className="text-[10px] text-gray-500">{timeStr}</span>
                            </div>
                          );
                        }
                      }

                      // System messages (trip status) should be centered
                      if (isSystemMessage && message.tripStatus) {
                        return (
                          <div key={message._id} className="flex justify-center mb-4">
                            <div className="w-full max-w-2xl">
                              {/* Trip Status Card */}
                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-sm">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="text-sm font-bold text-primary">Driver Trip Status</h4>
                                      {message.tripStatus.summary.isCurrentlyDriving && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                          Currently Driving
                                        </span>
                                      )}
                                      {!message.tripStatus.summary.isCurrentlyDriving && message.tripStatus.summary.totalPending > 0 && (
                                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                                          Assigned
                                        </span>
                                      )}
                                      {!message.tripStatus.summary.isCurrentlyDriving && message.tripStatus.summary.totalPending === 0 && (
                                        <span className="px-2 py-0.5 bg-card text-primary text-xs font-semibold rounded-full">
                                          Available
                                        </span>
                                      )}
                                    </div>

                                    {/* AI Summary */}
                                    {message.tripStatus.aiSummary && (
                                      <p className="text-sm text-primary mb-3 leading-relaxed">
                                        {message.tripStatus.aiSummary}
                                      </p>
                                    )}

                                    {/* Trip Details */}
                                    <div className="space-y-2">
                                      {/* Active Trips */}
                                      {message.tripStatus.activeTrips.length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold text-secondary mb-1">Active Trips ({message.tripStatus.activeTrips.length}):</p>
                                          {message.tripStatus.activeTrips.map((trip, idx) => (
                                            <div key={idx} className="text-xs text-secondary bg-card/60 rounded p-2 mb-2 border border-theme">
                                              <div className="font-medium mb-2 flex items-center gap-2">
                                                <span>Trip {trip.tripNumber}</span>
                                                {trip.driverRole && (
                                                  <span className="px-2 py-0.5 bg-blue-100 text-[var(--accent-navyblue)] rounded text-xs">
                                                    {trip.driverRole}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-primary space-y-1">
                                                <div className="font-medium text-primary">📍 Start Location:</div>
                                                <div className="ml-2">{trip.startLocation}</div>
                                                <div className="font-medium text-primary mt-2">📍 End Location:</div>
                                                <div className="ml-2">{trip.endLocation}</div>
                                                {trip.ordersCount > 0 && (
                                                  <div className="mt-2">
                                                    <span className="font-medium">📦 Orders:</span> {trip.ordersCount}
                                                  </div>
                                                )}
                                                {trip.truck && (
                                                  <div>
                                                    <span className="font-medium">🚚 Truck:</span> {trip.truck}
                                                  </div>
                                                )}
                                                {trip.trailer && (
                                                  <div>
                                                    <span className="font-medium">🚛 Trailer:</span> {trip.trailer}
                                                  </div>
                                                )}
                                                {trip.mainDriver && (
                                                  <div>
                                                    <span className="font-medium">👤 Main Driver:</span> {trip.mainDriver}
                                                  </div>
                                                )}
                                                {trip.coDriver && (
                                                  <div>
                                                    <span className="font-medium">👥 Co-Driver:</span> {trip.coDriver}
                                                  </div>
                                                )}
                                                {trip.actualStartDate && (
                                                  <div className="text-secondary mt-2 text-xs">
                                                    Started: {new Date(trip.actualStartDate).toLocaleString()}
                                                  </div>
                                                )}
                                                {trip.plannedEndDate && (
                                                  <div className="text-secondary text-xs">
                                                    Expected End: {new Date(trip.plannedEndDate).toLocaleString()}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Active Orders - All non-completed/canceled orders */}
                                      {message.tripStatus.activeOrders.length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold text-secondary mb-1">Active Orders ({message.tripStatus.activeOrders.length}):</p>
                                          {message.tripStatus.activeOrders.map((order, idx) => (
                                            <div key={idx} className="text-xs text-secondary bg-card/60 rounded p-2 mb-2 border border-theme">
                                              <div className="font-medium mb-2 flex items-center gap-2">
                                                <span>Order {order.orderNumber}</span>
                                                <span className={`px-2 py-0.5 rounded text-xs ${order.status === 'in-delivery' ? 'bg-yellow-100 text-yellow-700' :
                                                  order.status === 'delivered' ? 'bg-purple-100 text-purple-700' :
                                                    order.status === 'planned' ? 'bg-blue-100 text-[var(--accent-navyblue)]' :
                                                      order.status === 'quoted' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-card text-primary'
                                                  }`}>
                                                  {order.status}
                                                </span>
                                              </div>
                                              <div className="text-primary space-y-1">
                                                <div className="font-medium text-primary">📍 Pickup Location:</div>
                                                <div className="ml-2">{order.pickupLocation}</div>
                                                {order.pickupFullAddress && (
                                                  <div className="ml-2 text-secondary text-xs">{order.pickupFullAddress}</div>
                                                )}
                                                <div className="font-medium text-primary mt-2">📍 Delivery Location:</div>
                                                <div className="ml-2">{order.deliveryLocation}</div>
                                                {order.deliveryFullAddress && (
                                                  <div className="ml-2 text-secondary text-xs">{order.deliveryFullAddress}</div>
                                                )}
                                                {order.customer && (
                                                  <div className="mt-2">
                                                    <span className="font-medium">👤 Customer:</span> {order.customer}
                                                  </div>
                                                )}
                                                {order.truck && (
                                                  <div>
                                                    <span className="font-medium">🚚 Truck:</span> {order.truck}
                                                  </div>
                                                )}
                                                {order.trailer && (
                                                  <div>
                                                    <span className="font-medium">🚛 Trailer:</span> {order.trailer}
                                                  </div>
                                                )}
                                                {order.actualStartDate && (
                                                  <div className="text-secondary mt-2 text-xs">
                                                    Started: {new Date(order.actualStartDate).toLocaleString()}
                                                  </div>
                                                )}
                                                {order.pickupDate && !order.actualStartDate && (
                                                  <div className="text-secondary mt-2 text-xs">
                                                    Pickup: {new Date(order.pickupDate).toLocaleString()}
                                                  </div>
                                                )}
                                                {order.deliveryDate && (
                                                  <div className="text-secondary text-xs">
                                                    Delivery Due: {new Date(order.deliveryDate).toLocaleString()}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Pending Trips */}
                                      {message.tripStatus.pendingTrips.length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold text-secondary mb-1">Pending Trips ({message.tripStatus.pendingTrips.length}):</p>
                                          {message.tripStatus.pendingTrips.map((trip, idx) => (
                                            <div key={idx} className="text-xs text-secondary bg-card/60 rounded p-2 mb-2 border border-theme">
                                              <div className="font-medium mb-2 flex items-center gap-2">
                                                <span>Trip {trip.tripNumber}</span>
                                                {trip.driverRole && (
                                                  <span className="px-2 py-0.5 bg-blue-100 text-[var(--accent-navyblue)] rounded text-xs">
                                                    {trip.driverRole}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-primary space-y-1">
                                                <div className="font-medium text-primary">📍 Start Location:</div>
                                                <div className="ml-2">{trip.startLocation}</div>
                                                <div className="font-medium text-primary mt-2">📍 End Location:</div>
                                                <div className="ml-2">{trip.endLocation}</div>
                                                {trip.ordersCount > 0 && (
                                                  <div className="mt-2">
                                                    <span className="font-medium">📦 Orders:</span> {trip.ordersCount}
                                                  </div>
                                                )}
                                                {trip.mainDriver && (
                                                  <div>
                                                    <span className="font-medium">👤 Main Driver:</span> {trip.mainDriver}
                                                  </div>
                                                )}
                                                {trip.coDriver && (
                                                  <div>
                                                    <span className="font-medium">👥 Co-Driver:</span> {trip.coDriver}
                                                  </div>
                                                )}
                                                {trip.plannedStartDate && (
                                                  <div className="text-secondary mt-2 text-xs">
                                                    Planned Start: {new Date(trip.plannedStartDate).toLocaleString()}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Pending Orders */}
                                      {message.tripStatus.pendingOrders.length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold text-secondary mb-1">Pending Orders ({message.tripStatus.pendingOrders.length}):</p>
                                          {message.tripStatus.pendingOrders.map((order, idx) => (
                                            <div key={idx} className="text-xs text-secondary bg-card/60 rounded p-2 mb-2 border border-theme">
                                              <div className="font-medium mb-2 flex items-center gap-2">
                                                <span>Order {order.orderNumber}</span>
                                                <span className={`px-2 py-0.5 rounded text-xs ${order.status === 'planned' ? 'bg-blue-100 text-[var(--accent-navyblue)]' :
                                                  order.status === 'quoted' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-card text-primary'
                                                  }`}>
                                                  {order.status}
                                                </span>
                                              </div>
                                              <div className="text-primary space-y-1">
                                                <div className="font-medium text-primary">📍 Pickup Location:</div>
                                                <div className="ml-2">{order.pickupLocation}</div>
                                                {order.pickupFullAddress && (
                                                  <div className="ml-2 text-secondary text-xs">{order.pickupFullAddress}</div>
                                                )}
                                                <div className="font-medium text-primary mt-2">📍 Delivery Location:</div>
                                                <div className="ml-2">{order.deliveryLocation}</div>
                                                {order.deliveryFullAddress && (
                                                  <div className="ml-2 text-secondary text-xs">{order.deliveryFullAddress}</div>
                                                )}
                                                {order.customer && (
                                                  <div className="mt-2">
                                                    <span className="font-medium">👤 Customer:</span> {order.customer}
                                                  </div>
                                                )}
                                                {order.pickupDate && (
                                                  <div className="text-secondary mt-2 text-xs">
                                                    Pickup: {new Date(order.pickupDate).toLocaleString()}
                                                  </div>
                                                )}
                                                {order.deliveryDate && (
                                                  <div className="text-secondary text-xs">
                                                    Delivery Due: {new Date(order.deliveryDate).toLocaleString()}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* No trips/orders */}
                                      {message.tripStatus.summary.totalActive === 0 && message.tripStatus.summary.totalPending === 0 && (
                                        <p className="text-xs text-secondary italic">No active trips or orders assigned.</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

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
                                      : "bg-card hover:bg-gray-200 text-[var(--accent-navyblue)]"
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
                    <File className="w-4 h-4 text-[var(--accent-navyblue)]" />
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

            {/* Input Area */}
            <div className="flex-shrink-0 px-3 py-2 bg-card border-t border-theme shadow-sm">
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
                  className="p-2.5 text-secondary hover:text-[var(--accent-navyblue)] hover:bg-blue-50 rounded-lg transition-all duration-200 flex-shrink-0"
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
                    className="w-full px-3 py-2 text-sm border border-theme rounded-xl focus:outline-none focus:ring-2 focus:border-transparent resize-none bg-card text-primary placeholder-gray-400 transition-all"
                    rows={1}
                    style={{ maxHeight: "100px", focusRingColor: '#007A6E' } as any}
                  />
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={sending || uploadingFile || (!newMessage.trim() && !selectedFile)}
                  className="p-2 !text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
                  style={{ background: '#1976D2' }}
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-card">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center bg-card">
                <MessageCircle className="w-7 h-7 text-[var(--accent-navyblue)]" />
              </div>
              <p className="text-primary font-semibold text-sm mb-1">Select a driver to chat</p>
              <p className="text-xs text-secondary">Choose from the list on the left</p>
            </div>
          </div>
        )}


      </div>

      {/* ── Full call overlay ─────────────────────────────────────────────────── */}
      {(callState === "calling" || callState === "incoming" || (callState === "connected" && !isMinimized) || callState === "declined") && (
        <div
          className="absolute inset-0 z-50 flex flex-col rounded-lg overflow-hidden"
          style={{ background: "linear-gradient(160deg,#0f0f1a 0%,#1a1a2e 50%,#16213e 100%)" }}
        >
          {callState === "declined" ? (
            /* ── Declined state ── */
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mb-5">
                <PhoneOff className="w-9 h-9 text-red-400" />
              </div>
              <p className="text-white text-xl font-bold mb-2">
                {prevCallStateRef.current === 'connected' ? 'Call Ended' : 'Call Declined'}
              </p>
              <p className="text-white/50 text-sm">
                {prevCallStateRef.current === 'connected' ? 'Driver ended the call' : 'The call was not accepted'}
              </p>
            </div>
          ) : (
            <>
              {/* Top bar — label + minimize */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                <div className="w-9" />
                <p className="text-white/60 text-sm font-medium tracking-wide">
                  {callState === "incoming" ? "Incoming Call" : callState === "connected" ? "On Call" : "Calling..."}
                </p>
                {callState === "connected" ? (
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    title="Minimize"
                  >
                    <Minimize2 className="w-4 h-4 text-white/70" />
                  </button>
                ) : <div className="w-9" />}
              </div>

              {/* Center — avatar, name, timer/status */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <div
                  className={`w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center mb-5 text-white text-4xl font-bold border-4 border-white/10 shadow-[0_0_40px_rgba(25,118,210,0.4)] ${callState === "incoming" ? "animate-pulse" : ""}`}
                >
                  {selectedDriver?.name?.charAt(0).toUpperCase() || "D"}
                </div>
                <p className="text-white text-2xl font-bold mb-2 tracking-tight">{selectedDriver?.name || "Driver"}</p>
                <p className={`text-base font-mono tracking-widest ${callState === "connected" ? "text-green-400" : "text-white/50"}`}>
                  {callState === "connected" ? formatCallTime(callSeconds) : callState === "incoming" ? "Incoming…" : "Calling…"}
                </p>
              </div>

              {/* Bottom — controls + action buttons */}
              <div className="pb-10 px-8 flex flex-col items-center gap-6 flex-shrink-0">
                {/* Mute + Speaker row — only while connected */}
                {callState === "connected" && (
                  <div className="flex gap-8 items-center">
                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={toggleMute}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors border ${isMuted ? "bg-white/25 border-white/35" : "bg-white/10 border-white/15 hover:bg-white/20"}`}
                      >
                        {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                      </button>
                      <span className="text-white/55 text-xs">{isMuted ? "Unmute" : "Mute"}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center opacity-40 cursor-not-allowed">
                        <Volume2 className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-white/35 text-xs">Speaker</span>
                    </div>
                  </div>
                )}

                {/* Accept / End / Decline */}
                <div className="flex gap-12 items-end">
                  {callState === "incoming" && (
                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={acceptCall}
                        className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.45)] transition-all hover:scale-105"
                      >
                        <Phone className="w-6 h-6 text-white" />
                      </button>
                      <span className="text-white/60 text-xs">Accept</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={
                        callState === "incoming"
                          ? rejectCall
                          : () => endCall()
                      }
                      className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.45)] transition-all hover:scale-105"
                    >
                      <PhoneOff className="w-6 h-6 text-white" />
                    </button>
                    <span className="text-white/60 text-xs">{callState === "incoming" ? "Decline" : "End Call"}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DriverChat;

