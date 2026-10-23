import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Edit, Plus, X, Package, DollarSign, Route, Truck, MessageCircle, File, Download, ChevronDown } from "lucide-react";
import { FaCheckCircle, FaExclamationCircle, FaTimes, FaTruck } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import NewOrderSidebar from "./NewOrderSidebar";
import { listOrder, deleteOrder, getOrderById, updateOrder, approveOrderDocuments } from "../../../../../axios/api/distapcher";
import { listPlace } from "../../../../../axios/api/dispatcher.places";
import ConfirmationModal from "../../../../../components/common/ConfirmationModal";
import OrderChat from "../../../../../components/chat/OrderChat";
import { getOrderUnreadMessageCount } from "../../../../../axios/api/chat";
import { createPortal } from "react-dom";
import { socketService } from "../../../../../services/socketService";

// Color constants
const PRIMARY_GRADIENT = 'linear-gradient(90deg, #0ea5c0 0%, #1e3a8a 100%)';
const PRIMARY_COLOR = '#0ea5c0';


interface Place {
  _id: string;
  name?: string;
  city?: string;
  state?: string;
  currentLocation?: {
    address?: string;
    latitude?: string | number;
    longitude?: string | number;
  };
}

type NotificationType = 'success' | 'error' | 'warning' | 'chat' | 'document_upload';

interface ToastNotification {
  id: number;
  type: NotificationType;
  message: string;
  orderId?: string;
  orderNumber?: string;
  driverName?: string;
}

const ToastNotification = ({ notification, onClose, onChatClick, onDocumentClick }: {
  notification: ToastNotification;
  onClose: (id: number) => void;
  onChatClick?: (orderId: string) => void;
  onDocumentClick?: (orderId: string) => void;
}) => {
  const [progress, setProgress] = useState(100);
  const duration = notification.type === 'chat' ? 8000 : 5000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, duration);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const decrement = (100 / duration) * 50;
        return Math.max(0, prev - decrement);
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [notification.id, onClose, duration]);

  const handleClick = () => {
    if (notification.type === 'chat' && notification.orderId && onChatClick) {
      onChatClick(notification.orderId);
      onClose(notification.id);
    } else if (notification.type === 'document_upload' && notification.orderId && onDocumentClick) {
      onDocumentClick(notification.orderId);
      onClose(notification.id);
    }
  };

  // Document Upload notification (Advanced UI)
  if (notification.type === 'document_upload') {
    return (
      <div
        onClick={handleClick}
        className="fixed top-4 right-4 w-[400px] bg-card rounded-2xl shadow-2xl z-[10000] animate-slide-in cursor-pointer hover:shadow-3xl transition-all duration-300 hover:scale-[1.02] border border-theme overflow-hidden"
      >
        <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-100" style={{ width: `${progress}%` }}></div>
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                <File className="w-6 h-6" />
              </div>
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white absolute ml-8 -mt-3 animate-pulse"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-primary text-base">
                  📄 Documents Uploaded
                </h4>
              </div>
              <p className="text-primary text-sm leading-relaxed mb-2">
                <strong>{notification.driverName || 'Driver'}</strong> has uploaded POD and Manifest documents
              </p>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] text-xs font-semibold rounded-full">
                  <FaTruck className="w-3 h-3" />
                  Order #{notification.orderNumber}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-green-600 text-xs font-semibold">
                  <File className="w-4 h-4" />
                  <span>Click to view documents</span>
                </div>
                <div className="flex-1"></div>
                <span className="text-secondary text-xs">Just now</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(notification.id);
              }}
              className="flex-shrink-0 w-8 h-8 rounded-full hover:hover:bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-secondary hover:text-secondary transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chat notification (Advanced UI)
  if (notification.type === 'chat') {
    return (
      <div
        onClick={handleClick}
        className="fixed top-4 right-4 w-[400px] bg-card rounded-2xl shadow-2xl z-[10000] animate-slide-in cursor-pointer hover:shadow-3xl transition-all duration-300 hover:scale-[1.02] border border-theme overflow-hidden"
      >
        <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100" style={{ width: `${progress}%` }}></div>
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {notification.driverName?.charAt(0) || 'D'}
              </div>
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white absolute ml-8 -mt-3"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-primary text-base">
                  {notification.driverName || 'Driver'}
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] text-xs font-semibold rounded-full">
                  <FaTruck className="w-3 h-3" />
                  {notification.orderNumber}
                </span>
              </div>
              <p className="text-primary text-sm leading-relaxed line-clamp-2 mb-3">
                {notification.message}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-[#00D1FF] text-xs font-semibold">
                  <MessageCircle className="w-4 h-4" />
                  <span>Click to reply</span>
                </div>
                <div className="flex-1"></div>
                <span className="text-secondary text-xs">Just now</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(notification.id);
              }}
              className="flex-shrink-0 w-8 h-8 rounded-full hover:hover:bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-secondary hover:text-secondary transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard notifications
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaExclamationCircle className="text-red-500" size={24} />,
    warning: <FaExclamationCircle className="text-yellow-500" size={24} />,
    chat: <MessageCircle className="text-blue-500" size={24} />,
    document_upload: <File className="text-green-500" size={24} />,
  };

  const bgColors = {
    success: 'bg-card border-green-500',
    error: 'bg-card border-red-500',
    warning: 'bg-card border-yellow-500',
    chat: 'bg-card border-blue-500',
    document_upload: 'bg-card border-green-500',
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${bgColors[notification.type]} animate-slide-in min-w-[300px] max-w-[500px]`}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[notification.type]}
      </div>
      <p className="flex-1 text-sm font-medium text-primary">{notification.message}</p>
      <button
        onClick={() => onClose(notification.id)}
        className="flex-shrink-0 text-secondary hover:text-secondary transition-colors"
      >
        <FaTimes size={16} />
      </button>
    </div>
  );
};

interface Order {
  id: string;
  orderNo: string;
  custOrderNo: string;
  tripNo: string;
  orderDate: string;
  orderType: string;
  totalItems: number;
  companyName: string;
  customerName: string;
  pickupDate: string;
  pickupLocation: string;
  pickupRefNo: string;
  deliveryDate: string;
  deliveryLocation: string;
  deliveryRefNo: string;
  totalAmount: string;
  currency: string;
  status: string;
  accountingStatus?: string;
  driver: string;
  coDriver: string;
  truckNo: string;
  trailerNo: string;
  attachments?: Array<{
    id?: string;
    name?: string;
    url?: string;
    type?: string;
    fileSize?: number;
    uploadedAt?: string;
    uploadedBy?: string;
  }>;
  documentVerification?: {
    podDocument?: {
      fileUrl?: string;
      fileName?: string;
      uploadedAt?: string;
    };
    borderManifestDocument?: {
      fileUrl?: string;
      fileName?: string;
      uploadedAt?: string;
    };
    verificationStatus?: string;
  };
  documentsApproved?: boolean;
  documentsApprovedBy?: {
    _id: string;
    name: string;
    email?: string;
  };
  documentsApprovedAt?: string;
  approvedWithoutDocuments?: boolean;
  driverAcceptanceStatus?: 'pending' | 'accepted' | 'rejected';
  driverRejectionReason?: string;
  _id?: string;
}

const OrderList = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; orderId: string | null }>({ show: false, orderId: null });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [, setActionMenuOpen] = useState<string | null>(null);

  // Order details sidebar state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [chatOrderNumber, setChatOrderNumber] = useState<string>("");
  const [, setUnreadCounts] = useState<Record<string, number>>({});

  // Documents modal state
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedOrderForDocuments, setSelectedOrderForDocuments] = useState<Order | null>(null);

  // Bulk selection
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkApproveLoading, setBulkApproveLoading] = useState(false);

  // Navigation
  const navigate = useNavigate();
  const location = useLocation();

  // Refs for scrollbar synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  // Places state for search dropdowns
  const [, setPlaces] = useState<Place[]>([]);

  // Load Board filter state (must be declared before the fetchOrders useEffect that depends on it)
  const [loadBoard, setLoadBoard] = useState("LOAD BOARD");

  const [, setPickupLocationDropdownOpen] = useState(false);

  const [, setDeliveryLocationDropdownOpen] = useState(false);
  const pickupLocationDropdownRef = useRef<HTMLDivElement>(null);
  const deliveryLocationDropdownRef = useRef<HTMLDivElement>(null);

  const addNotification = useCallback((type: NotificationType, message: string, extra?: { orderId?: string; orderNumber?: string; driverName?: string }) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message, ...extra }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Note: Document upload notifications are now handled globally in the Layout component
  // No need for local listener here anymore

  // Handle chat notification click - open chat without updating URL if already open
  const handleChatNotificationClick = useCallback((orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      // If chat is already open for this order, just ensure it's visible (don't update URL)
      if (showChat && chatOrderId === orderId) {
        return; // Chat already open, no need to do anything
      }

      // Open chat (URL will be updated by useEffect only if needed)
      setChatOrderId(order.id);
      setChatOrderNumber(order.orderNo);
      setShowChat(true);
    }
  }, [orders, showChat, chatOrderId]);

  // Handle document notification click - open documents modal
  const handleDocumentNotificationClick = useCallback((orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      console.log('📄 Opening documents modal for order:', orderId);
      setSelectedOrderForDocuments(order);
      setShowDocumentsModal(true);
    }
  }, [orders]);

  // Handle orderId query parameter to open chat
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const orderIdFromQuery = searchParams.get('orderId');

    if (orderIdFromQuery && orders.length > 0) {
      const order = orders.find(o => o.id === orderIdFromQuery);
      if (order) {
        setChatOrderId(order.id);
        setChatOrderNumber(order.orderNo);
        setShowChat(true);
        // Clear query param after opening
        navigate(location.pathname, { replace: true });
      }
    }
  }, [location.search, orders, navigate, location.pathname]);

  // Update URL only when chat state changes (not on every render to prevent blinking)
  const prevChatStateRef = useRef({ showChat: false, chatOrderId: null as string | null });

  useEffect(() => {
    const prevState = prevChatStateRef.current;
    const currentState = { showChat, chatOrderId };

    // Only update URL if state actually changed
    if (prevState.showChat !== currentState.showChat || prevState.chatOrderId !== currentState.chatOrderId) {
      if (showChat && chatOrderId) {
        // Only update URL if chat is opening (not already open)
        if (!prevState.showChat || prevState.chatOrderId !== chatOrderId) {
          const currentParams = new URLSearchParams(location.search);
          const currentOrderId = currentParams.get('orderId');

          // Only navigate if URL doesn't already have the correct orderId
          if (currentOrderId !== chatOrderId) {
            navigate(`${location.pathname}?orderId=${encodeURIComponent(chatOrderId)}`, { replace: true });
          }
        }
      } else if (!showChat && !chatOrderId) {
        // Remove orderId from URL when chat is closed
        const currentParams = new URLSearchParams(location.search);
        if (currentParams.has('orderId')) {
          navigate(location.pathname, { replace: true });
        }
      }

      prevChatStateRef.current = currentState;
    }
  }, [showChat, chatOrderId, navigate, location.pathname, location.search]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        setUserInfo(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error parsing userInfo from localStorage:', error);
    }
    fetchOrders();
    fetchPlaces();
  }, []);

  // Use refs to always have latest values in socket handler
  const ordersRef = useRef(orders);
  const showChatRef = useRef(showChat);
  const chatOrderIdRef = useRef(chatOrderId);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    showChatRef.current = showChat;
    chatOrderIdRef.current = chatOrderId;
  }, [showChat, chatOrderId]);

  // Socket listener for new chat messages (popup notifications)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const currentUserId = localStorage.getItem('userId');

    if (!token) {
      console.log('⚠️ No token found for socket connection');
      return;
    }

    if (orders.length === 0) {
      console.log('⏳ Waiting for orders to load...');
      return;
    }

    let isMounted = true;
    let messageHandler: ((message: any) => void) | null = null;

    socketService
      .connect(token)
      .then(async () => {
        if (!isMounted) return;

        console.log('✅ Socket connected for order chat notifications');

        // Wait for socket to be authenticated
        let retries = 0;
        while (!socketService.getIsAuthenticated() && retries < 20 && isMounted) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        if (!isMounted) return;

        if (!socketService.getIsAuthenticated()) {
          console.warn('⚠️ Socket not authenticated after retries');
          return;
        }

        console.log('✅ Socket authenticated');

        // Join all order chat rooms to receive messages
        const ordersToJoin = ordersRef.current;
        console.log(`🔌 Joining ${ordersToJoin.length} order chat rooms...`);

        let joinedCount = 0;
        for (const order of ordersToJoin) {
          if (!isMounted) break;

          try {
            await socketService.joinTripChat(order.id);
            joinedCount++;
            console.log(`✅ Joined order chat room: ${order.orderNo} (${joinedCount}/${ordersToJoin.length})`);
            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 10));
          } catch (error) {
            console.error(`❌ Failed to join order ${order.orderNo}:`, error);
          }
        }
        console.log(`✅ Successfully joined ${joinedCount}/${ordersToJoin.length} order chat rooms`);

        messageHandler = (message: any) => {
          if (!isMounted) return;

          console.log('📨 New message received:', {
            messageId: message._id,
            orderId: message.orderId,
            tripId: message.tripId,
            senderId: message.senderId?._id,
            senderName: message.senderId?.name,
            message: message.message?.substring(0, 50)
          });

          // Only show notification if message is NOT from current user
          const senderId = message.senderId?._id?.toString() || message.senderId?._id || message.senderId;
          const currentUserIdStr = currentUserId?.toString() || currentUserId;

          console.log('🔍 Checking sender:', { senderId, currentUserIdStr, areEqual: senderId === currentUserIdStr });

          if (senderId === currentUserIdStr) {
            console.log('⚠️ Message is from current user, skipping notification');
            return; // Don't show notification for own messages
          }

          // Get orderId from message
          const messageOrderId = message.orderId || message.tripId;
          if (!messageOrderId) {
            console.log('⚠️ Message has no orderId or tripId');
            return;
          }

          console.log('🔍 Looking for order:', messageOrderId);

          // Use ref to get latest orders
          const currentOrders = ordersRef.current;
          const order = currentOrders.find(o => o.id === messageOrderId);

          if (!order) {
            console.log('⚠️ Order not found in current orders list:', messageOrderId, 'Total orders:', currentOrders.length);
            return;
          }

          console.log('✅ Order found:', order.orderNo);

          // Use refs to check current chat state
          const currentShowChat = showChatRef.current;
          const currentChatOrderId = chatOrderIdRef.current;

          // Don't show popup if chat is already open for this order
          if (currentShowChat && currentChatOrderId === messageOrderId) {
            console.log('ℹ️ Chat already open for this order, just updating unread count');
            // Just update unread count
            setUnreadCounts(prev => ({
              ...prev,
              [messageOrderId]: (prev[messageOrderId] || 0) + 1
            }));
            return;
          }

          // Show popup notification
          const driverName = message.senderId?.name || message.senderName || 'Driver';
          console.log('📢 Showing popup notification for:', {
            orderId: messageOrderId,
            orderNumber: order.orderNo,
            driverName,
            message: message.message?.substring(0, 50)
          });

          addNotification('chat', message.message || 'New message', {
            orderId: messageOrderId,
            orderNumber: order.orderNo,
            driverName: driverName
          });

          // Update unread count
          setUnreadCounts(prev => ({
            ...prev,
            [messageOrderId]: (prev[messageOrderId] || 0) + 1
          }));

          // Play notification sound
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Sound play failed:', e));
          } catch (e) {
            console.log('Audio not available');
          }
        };

        socketService.onNewMessage(messageHandler);
        console.log('👂 Socket message listener registered');

        return () => {
          isMounted = false;
          if (messageHandler) {
            socketService.offNewMessage(messageHandler);
          }
          console.log('🧹 Cleaned up socket listener');
        };
      })
      .catch(error => {
        console.error('❌ Socket connection error:', error);
      });

    return () => {
      isMounted = false;
    };
  }, [orders.length, addNotification]);

  // Sync scroll between top and bottom scrollbars
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const bottomScroll = bottomScrollRef.current;

    if (!topScroll || !bottomScroll) return;

    let isScrolling = false;

    const handleTopScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      bottomScroll.scrollLeft = topScroll.scrollLeft;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    const handleBottomScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      topScroll.scrollLeft = bottomScroll.scrollLeft;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    // Sync scroll widths
    const syncScrollWidths = () => {
      const bottomScrollWidth = bottomScroll.scrollWidth;
      const topInner = topScroll.querySelector('.top-scroll-content') as HTMLElement;
      if (topInner && bottomScrollWidth > 0) {
        topInner.style.width = `${bottomScrollWidth}px`;
        topScroll.scrollLeft = bottomScroll.scrollLeft;
      }
    };

    // Initial sync - wait for table to render
    const timeoutId = setTimeout(syncScrollWidths, 100);
    const timeoutId2 = setTimeout(syncScrollWidths, 300);
    const timeoutId3 = setTimeout(syncScrollWidths, 500);

    // Observe table changes
    const tableObserver = new MutationObserver(() => {
      syncScrollWidths();
    });

    const bottomTable = bottomScroll.querySelector('table');
    if (bottomTable) {
      tableObserver.observe(bottomTable, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    topScroll.addEventListener('scroll', handleTopScroll, { passive: true });
    bottomScroll.addEventListener('scroll', handleBottomScroll, { passive: true });
    window.addEventListener('resize', syncScrollWidths);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      tableObserver.disconnect();
      topScroll.removeEventListener('scroll', handleTopScroll);
      bottomScroll.removeEventListener('scroll', handleBottomScroll);
      window.removeEventListener('resize', syncScrollWidths);
    };
  }, [orders, loading]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (pickupLocationDropdownRef.current && target && !pickupLocationDropdownRef.current.contains(target)) {
        setPickupLocationDropdownOpen(false);
      }
      if (deliveryLocationDropdownRef.current && target && !deliveryLocationDropdownRef.current.contains(target)) {
        setDeliveryLocationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPlaces = async () => {
    try {
      const response = await listPlace();
      if (response?.success && response?.data) {
        setPlaces(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching places:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [userInfo?.company, loadBoard]);

  // Fetch unread message counts for all orders
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (orders.length === 0) return;

      try {
        const counts: Record<string, number> = {};

        // Fetch unread counts for all orders (limit to first 50 to avoid too many requests)
        const ordersToCheck = orders.slice(0, 50);
        await Promise.all(
          ordersToCheck.map(async (order) => {
            try {
              const response = await getOrderUnreadMessageCount(order.id);
              if (response?.success && response?.data) {
                counts[order.id] = response.data.unreadCount;
              }
            } catch (error) {
              console.error(`Error fetching unread count for order ${order.id}:`, error);
            }
          })
        );

        setUnreadCounts(counts);
      } catch (error) {
        console.error('Error fetching unread counts:', error);
      }
    };

    fetchUnreadCounts();
  }, [orders]);

  // Real-time driver acceptance updates
  useEffect(() => {
    const handleOrderAcceptanceUpdated = (data: {
      orderId: string;
      orderNumber: string;
      driverAcceptanceStatus: 'accepted' | 'rejected';
      driverRejectionReason?: string;
    }) => {
      if (!data?.orderId) return;

      // Update badge in-place without refetch
      setOrders(prev => prev.map(o =>
        (o as any)._id === data.orderId
          ? { ...o, driverAcceptanceStatus: data.driverAcceptanceStatus, driverRejectionReason: data.driverRejectionReason } as any
          : o
      ));

      // Show toast
      const label = data.orderNumber ? `Order ${data.orderNumber}` : 'An order';
      if (data.driverAcceptanceStatus === 'accepted') {
        addNotification('success', `${label}: Driver accepted the assignment.`);
      } else {
        const reason = data.driverRejectionReason ? ` Reason: "${data.driverRejectionReason}".` : '';
        addNotification('warning', `${label}: Driver rejected the assignment.${reason} Please assign another driver.`);
      }
    };

    socketService.onOrderAcceptanceUpdated(handleOrderAcceptanceUpdated);
    return () => socketService.offOrderAcceptanceUpdated();
  }, [addNotification]);

  // Helper function to safely extract location string
  const extractLocationString = (location: any): string => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    if (typeof location !== 'object') return '';

    try {
      // Try different paths to get the location string
      // First check if place field exists
      if (location.place && typeof location.place === 'string') {
        return location.place;
      }

      // Check if placeId is populated (object) with currentLocation
      if (location.placeId) {
        if (typeof location.placeId === 'object' && location.placeId !== null) {
          // Check for populated Place object
          if (location.placeId.currentLocation?.address && typeof location.placeId.currentLocation.address === 'string') {
            return location.placeId.currentLocation.address;
          }
          if (location.placeId.name && typeof location.placeId.name === 'string') {
            return location.placeId.name;
          }
        }
      }

      // Fallback to other fields
      if (location.address && typeof location.address === 'string') {
        return location.address;
      }
      if (location.name && typeof location.name === 'string') {
        return location.name;
      }
    } catch (error) {
      console.error('Error extracting location string:', error);
    }

    return '';
  };

  // Maps the Load Board dropdown's display value to the value the backend's
  // loadBoard switch actually matches (dispatcher/order?loadBoard=...)
  const LOAD_BOARD_PARAM: Record<string, string> = {
    'HISTORICAL LOAD BOARD': 'HISTORICAL',
    'CITY LOAD BOARD': 'CITY',
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await listOrder({
        page: currentPage,
        limit: itemsPerPage,
        status: orderStatus || undefined,
        orderType: orderType || undefined,
        loadBoard: loadBoard !== 'LOAD BOARD' ? (LOAD_BOARD_PARAM[loadBoard] || loadBoard) : undefined
      });

      if (response?.success && response?.data) {
        console.log('📋 Raw orders from backend:', response.data);
        console.log('📎 First order attachments:', response.data[0]?.attachments);

        const formattedOrders = response.data.map((order: any) => ({
          id: order._id,
          orderNo: order.orderNumber || order._id,
          custOrderNo: order.customerOrderNo || '',
          tripNo: order.tripNo || '',
          orderDate: order.orderDate ? new Date(order.orderDate).toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) : '',
          orderType: order.orderType || 'Regular',
          totalItems: order.noOfPackages || 0,
          companyName: "Black River Logistics Ltd", // You might want to fetch this from company settings
          customerName: order.customer?.name || 'N/A',
          pickupDate: order.pickupDate ? new Date(order.pickupDate).toLocaleDateString('en-US') : '',
          pickupLocation: extractLocationString(order.pickupLocation) || '',
          pickupRefNo: order.pickupRefNo || '',
          deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-US') : '',
          deliveryLocation: extractLocationString(order.deliveryLocation) || '',
          deliveryRefNo: order.deliveryRefNo || '',
          totalAmount: order.totalAmount?.toFixed(2) || '0.00',
          rate: order.rate || order.totalAmount || 0,
          currency: order.currency || order.rateCurrency || 'CAD',
          status: order.status || 'QUOTED',
          driver: order.driver?.name || '',
          coDriver: order.coDriver?.name || '',
          truckNo: order.truck?.licensePlate || order.truck?.unitNo || order.truck?.internalId || '',
          trailerNo: order.trailer?.licensePlate || order.trailer?.unitNo || '',
          // Additional fields for table display
          shipperCity: order.shipper?.city || '',
          shipperState: order.shipper?.province || order.shipper?.state || '',
          receiverCity: order.receiver?.city || '',
          receiverState: order.receiver?.province || order.receiver?.state || '',
          receiverAddress: order.receiver?.address || '',
          temperature: order.temperature || '',
          temperatureUnit: order.temperatureUnit || '',
          hazmat: order.additionalInfo?.HAZMAT || false,
          bookedForCarrier: order.bookedForCarrier || false,
          dispatcher: order.dispatcher || '',
          carrier: order.carrier || '',
          borderInfo: order.borderInfo || null,
          // Document fields
          attachments: order.attachments || [],
          documentVerification: order.documentVerification || null,
          documentsApproved: order.documentsApproved || false,
          documentsApprovedBy: order.documentsApprovedBy,
          documentsApprovedAt: order.documentsApprovedAt,
          approvedWithoutDocuments: order.approvedWithoutDocuments || false,
          // Driver acceptance
          driverAcceptanceStatus: order.driverAcceptanceStatus || 'pending',
          driverRejectionReason: order.driverRejectionReason || '',
          _id: order._id,
          // Keep full order object for reference
          _fullOrder: order
        }));
        setOrders(formattedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const [dispatcher, setDispatcher] = useState("");

  // Filter states (keeping for backward compatibility)
  const [orderType] = useState("");
  const [createdDate, setCreatedDate] = useState("");
  const [byDays, setByDays] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [] = useState("");
  const [sortBy, setSortBy] = useState("");

  // Search states
  const [orderNo] = useState("");
  const [custOrderNo] = useState("");
  const [tripNo] = useState("");
  const [pickupDeliveryRef] = useState("");
  const [custName] = useState("");
  const [pickupLocation] = useState("");
  const [deliveryLocation] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Load Board view filtering/sorting now happens server-side (dispatcher/order?loadBoard=...)
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesOrderNo = !orderNo || order.orderNo.toLowerCase().includes(orderNo.toLowerCase());
      const matchesCustOrderNo = !custOrderNo || order.custOrderNo.toLowerCase().includes(custOrderNo.toLowerCase());
      const matchesTripNo = !tripNo || order.tripNo.toLowerCase().includes(tripNo.toLowerCase());
      const matchesPickupDeliveryRef = !pickupDeliveryRef ||
        (order.pickupRefNo && order.pickupRefNo.toLowerCase().includes(pickupDeliveryRef.toLowerCase())) ||
        (order.deliveryRefNo && order.deliveryRefNo.toLowerCase().includes(pickupDeliveryRef.toLowerCase()));
      const matchesCustName = !custName || (order.customerName && order.customerName.toLowerCase().includes(custName.toLowerCase()));
      // Extract location strings - orders should already have strings, but handle both cases
      const pickupLocStr = typeof order.pickupLocation === 'string' ? order.pickupLocation : extractLocationString(order.pickupLocation);
      const deliveryLocStr = typeof order.deliveryLocation === 'string' ? order.deliveryLocation : extractLocationString(order.deliveryLocation);
      const matchesPickupLocation = !pickupLocation || (pickupLocStr && pickupLocStr.toLowerCase().includes(pickupLocation.toLowerCase()));
      const matchesDeliveryLocation = !deliveryLocation || (deliveryLocStr && deliveryLocStr.toLowerCase().includes(deliveryLocation.toLowerCase()));
      const matchesOrderType = !orderType || order.orderType === orderType;
      const matchesStatus = !orderStatus || order.status === orderStatus;

      return matchesOrderNo && matchesCustOrderNo && matchesTripNo && matchesPickupDeliveryRef &&
        matchesCustName && matchesPickupLocation && matchesDeliveryLocation && matchesOrderType && matchesStatus;
    });
  }, [orders, orderNo, custOrderNo, tripNo, pickupDeliveryRef, custName, pickupLocation, deliveryLocation, orderType, orderStatus]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );








  const handleCreateOrder = () => {
    setEditingOrder(null);
    setSidebarOpen(true);
  };

  const handleEditOrder = async (order: Order) => {
    try {
      // Fetch full order details with populated fields
      const response = await getOrderById(order.id);
      if (response?.success && response?.data) {
        setEditingOrder(response.data);
        setSidebarOpen(true);
        setActionMenuOpen(null);
      } else {
        addNotification('error', response?.message || "Failed to load order details");
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      addNotification('error', "Failed to load order details. Please try again.");
    }
  };


  const confirmDeleteOrder = async () => {
    if (!deleteConfirm.orderId) return;

    try {
      const response = await deleteOrder(deleteConfirm.orderId);
      if (response?.success) {
        setOrders(orders.filter((o) => o.id !== deleteConfirm.orderId));
        addNotification('success', "Order deleted successfully");
      } else {
        addNotification('error', response?.message || "Failed to delete order");
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      addNotification('error', "Failed to delete order. Please try again.");
    } finally {
      setDeleteConfirm({ show: false, orderId: null });
      setActionMenuOpen(null);
    }
  };

  // Helper function to get DEMO document status (for static display)

  const handleSaveOrder = async () => {
    // Order is already saved by the sidebar component
    // Close sidebar first, then refresh the list to get properly formatted data
    setSidebarOpen(false);
    setEditingOrder(null);
    // Wait a moment for the order to be saved in the database
    setTimeout(() => {
      fetchOrders();
    }, 500);
  };


  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "quoted":
        return "bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)]";
      case "confirmed":
        return "bg-[var(--accent-green)]/10 text-[var(--accent-green)]";
      case "in_progress":
      case "in-progress":
      case "in-delivery":
        return "text-white";
      case "pending_review":
      case "verification_pending":
        return "bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]";
      case "completed":
        return "bg-white/5 text-primary";
      default:
        return "bg-white/5 text-primary";
    }
  };

  const getStatusStyle = (status: string) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === "in_progress" || statusLower === "in-progress" || statusLower === "in-delivery") {
      return { background: PRIMARY_GRADIENT };
    }
    if (statusLower === "pending_review" || statusLower === "verification_pending") {
      return { background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }; // Amber gradient
    }
    return {};
  };

  // Helper to extract city and state from location string or order object
  const extractCityState = (location: string | any, order?: any, type: 'shipper' | 'receiver' = 'shipper'): { city: string; state: string } => {
    // First try to get from order.shipper or order.receiver directly
    if (order) {
      if (type === 'shipper' && order.shipper) {
        return {
          city: order.shipper.city || '',
          state: order.shipper.province || order.shipper.state || ''
        };
      }
      if (type === 'receiver' && order.receiver) {
        // Receiver might have city/province in address, try to parse
        if (order.receiver.address) {
          const parts = order.receiver.address.split(',').map((p: string) => p.trim());
          if (parts.length >= 2) {
            // Try to extract city and state from address
            // Usually format: "City, State" or "Address, City, State"
            const lastTwo = parts.slice(-2);
            return {
              city: lastTwo[0] || '',
              state: lastTwo[1] || ''
            };
          }
        }
        // Check if receiver has city/province fields directly
        return {
          city: order.receiver.city || '',
          state: order.receiver.province || order.receiver.state || ''
        };
      }
    }

    // Fallback to parsing location string
    if (typeof location === 'string' && location) {
      const parts = location.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        // Try to get last two parts as city and state
        const lastTwo = parts.slice(-2);
        return { city: lastTwo[0] || '', state: lastTwo[1] || '' };
      }
      return { city: location, state: '' };
    }
    return { city: '', state: '' };
  };

  // Helper to format date and time
  const formatDateAndTime = (dateString: string): { date: string; time: string; isFuture: boolean } => {
    if (!dateString) return { date: '', time: '', isFuture: false };
    try {
      const date = new Date(dateString);
      const now = new Date();
      const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const isFuture = date > now;
      return { date: dateStr, time: timeStr, isFuture };
    } catch {
      return { date: dateString, time: '', isFuture: false };
    }
  };

  // Helper to truncate text with ellipsis
  const truncateText = (text: string, maxLength: number = 15): string => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Helper to generate Load # from order
  const getLoadNumber = (order: Order): string => {
    // Try to extract number from orderNo, or use a hash of the ID
    if (order.orderNo) {
      const match = order.orderNo.match(/\d+/);
      if (match) return match[0];
    }
    // Use last 4 digits of ID as fallback
    return order.id.slice(-4);
  };


  return (
    <div className="p-6 bg-main min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--accent-navyblue)]">Order List</h1>
        <button
          onClick={handleCreateOrder}
          style={{ background: PRIMARY_GRADIENT }}
          className="flex items-center gap-2 px-4 py-2 !text-white rounded-lg hover:opacity-90 transition-opacity shadow-md"
        >
          <Plus className="w-5 h-5" />
          Create Order
        </button>
      </div>

      {/* Load Board Style Filters */}
      <div className="mb-4 flex items-center gap-4">
        <select
          value={loadBoard}
          onChange={(e) => { setLoadBoard(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2 border border-theme rounded text-sm bg-card font-medium text-primary"
        >
          <option value="LOAD BOARD">LOAD BOARD</option>
          <option value="CITY LOAD BOARD">CITY LOAD BOARD</option>
          <option value="TO/FROM YARD">TO/FROM YARD</option>
          <option value="HISTORICAL LOAD BOARD">HISTORICAL LOAD BOARD</option>
          <option value="INBOUND">INBOUND</option>
          <option value="OUTBOUND">OUTBOUND</option>
        </select>
        <select
          value={dispatcher}
          onChange={(e) => setDispatcher(e.target.value)}
          className="px-4 py-2 border border-theme rounded text-sm bg-card font-medium text-primary"
        >
          <option value="">DISPATCHER</option>
          <option value="all">All Dispatchers</option>
          {/* Add dispatcher options here */}
        </select>
      </div>

      {/* Top Filter Bar */}
      <div
        className="p-3 rounded-lg mb-4 flex flex-wrap gap-3 bg-card border border-theme"
      >

        <select
          value={createdDate}
          onChange={(e) => setCreatedDate(e.target.value)}
          className="px-3 py-1.5 border border-theme rounded text-sm bg-card"
        >
          <option value="">Created Date</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
        <select
          value={byDays}
          onChange={(e) => setByDays(e.target.value)}
          className="px-3 py-1.5 border border-theme rounded text-sm bg-card"
        >
          <option value="">By Days</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
        <select
          value={orderStatus}
          onChange={(e) => setOrderStatus(e.target.value)}
          className="px-3 py-1.5 border border-theme rounded text-sm bg-card"
        >
          <option value="">By Order Status</option>
          <option value="QUOTED">Quoted</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1.5 border border border-theme rounded text-sm bg-card"
        >
          <option value="">By Sort</option>
          <option value="date-asc">Date (Ascending)</option>
          <option value="date-desc">Date (Descending)</option>
          <option value="amount-asc">Amount (Ascending)</option>
          <option value="amount-desc">Amount (Descending)</option>
        </select>
      </div>



      {/* Analytics Cards */}
      {(() => {
        const total = orders.length;
        const docsApproved = orders.filter(o => (o as any).documentsApproved).length;
        const pendingReview = orders.filter(o => {
          const s = (o.status || '').toLowerCase();
          return s === 'pending_review' || s === 'verification_pending';
        }).length;
        const approvalRate = total > 0 ? Math.round((docsApproved / total) * 100) : 0;
        return (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-card border border-theme rounded-lg p-4">
              <div className="text-xs text-secondary font-medium uppercase mb-1">Total Orders</div>
              <div className="text-2xl font-bold text-primary">{total}</div>
            </div>
            <div className="bg-card border border-theme rounded-lg p-4">
              <div className="text-xs text-secondary font-medium uppercase mb-1">Docs Approved</div>
              <div className="text-2xl font-bold text-green-500">{docsApproved}</div>
            </div>
            <div className="bg-card border border-theme rounded-lg p-4">
              <div className="text-xs text-secondary font-medium uppercase mb-1">Pending Review</div>
              <div className="text-2xl font-bold text-orange-400">{pendingReview}</div>
            </div>
            <div className="bg-card border border-theme rounded-lg p-4">
              <div className="text-xs text-secondary font-medium uppercase mb-1">Approval Rate</div>
              <div className="text-2xl font-bold text-[var(--accent-blue)]">{approvalRate}%</div>
            </div>
          </div>
        );
      })()}

      {/* Orders Table */}
      <div className="bg-card rounded-lg shadow-md overflow-hidden">
        {/* Top Scrollbar - Only visible horizontal scrollbar */}
        {/* Bulk approve toolbar */}
        {selectedOrderIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 border-b border-theme" style={{ background: 'var(--bg-card)' }}>
            <span className="text-sm font-medium text-primary">{selectedOrderIds.size} order(s) selected</span>
            <button
              disabled={bulkApproveLoading}
              onClick={async () => {
                if (!window.confirm(`Approve documents for ${selectedOrderIds.size} selected order(s)?`)) return;
                setBulkApproveLoading(true);
                let successCount = 0;
                let failCount = 0;
                const failMessages: string[] = [];
                for (const orderId of Array.from(selectedOrderIds)) {
                  try {
                    const res = await approveOrderDocuments(orderId, false);
                    if (res?.success) successCount++;
                    else { failCount++; if (res?.message) failMessages.push(res.message); }
                  } catch (err: any) {
                    failCount++;
                    const msg = err?.message || err?.error || 'Unknown error';
                    if (msg && !failMessages.includes(msg)) failMessages.push(msg);
                  }
                }
                setBulkApproveLoading(false);
                setSelectedOrderIds(new Set());
                if (successCount > 0 && failCount === 0) {
                  addNotification('success', `${successCount} order(s) approved successfully.`);
                } else if (successCount > 0 && failCount > 0) {
                  addNotification('warning', `${successCount} approved, ${failCount} failed: ${failMessages[0] || 'Unknown error'}`);
                } else {
                  addNotification('error', failMessages[0] || 'Failed to approve selected orders.');
                }
                fetchOrders();
              }}
              className="px-3 py-1.5 text-sm bg-green-600 !text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {bulkApproveLoading ? 'Approving...' : 'Bulk Approve Documents'}
            </button>
            <button
              onClick={() => setSelectedOrderIds(new Set())}
              className="px-3 py-1.5 text-sm bg-red-500 !text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        )}
        <style>{`
          .top-scrollbar-container::-webkit-scrollbar {
            height: 8px;
          }
          .top-scrollbar-container::-webkit-scrollbar-track {
            background: var(--bg-card);
          }
          .top-scrollbar-container::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
          }
          .top-scrollbar-container::-webkit-scrollbar-thumb:hover {
            background: #a0aec0;
          }
          .table-container-hidden-scrollbar {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE and Edge */
          }
          .table-container-hidden-scrollbar::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
        `}</style>
        <div
          ref={topScrollRef}
          className="overflow-x-auto overflow-y-hidden top-scrollbar-container"
          style={{
            maxHeight: '20px',
            marginBottom: '2px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#224c75 #111c24' /* Firefox */
          }}
        >
          <div className="top-scroll-content" style={{ height: '1px' }}></div>
        </div>
        {/* Main Table - Scrollbar hidden, controlled by top scrollbar */}
        <div
          ref={bottomScrollRef}
          className="overflow-x-auto table-container-hidden-scrollbar"
        >
          <table className="w-full">
            <thead className="bg-card border-b border-theme">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-blue-600"
                    checked={paginatedOrders.length > 0 && paginatedOrders.every(o => selectedOrderIds.has(o.id))}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedOrderIds(new Set(paginatedOrders.map(o => o.id)));
                      else setSelectedOrderIds(new Set());
                    }}
                    title="Select all"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Load #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Shipper City
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Shipper State
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Ship Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Receiver City
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Receiver State
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Receive Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Truck
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Trailer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Driver/Carrier
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Co-Driver
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Booked
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Entry
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Temp.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Hazmat
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Dispatcher
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Driver Response
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Carrier
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                  Documents
                </th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {loading ? (
                <tr>
                  <td colSpan={26} className="px-6 py-12 text-center text-secondary">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderBottomColor: PRIMARY_COLOR }}></div>
                    <p className="mt-2">Loading orders...</p>
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={26} className="px-6 py-12 text-center text-secondary">
                    <p className="text-lg font-medium">No orders found</p>
                    <p className="text-sm">Create a new order to get started</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const pickupLoc = extractLocationString(order.pickupLocation);
                  const deliveryLoc = extractLocationString(order.deliveryLocation);
                  // Use order data directly for city/state extraction
                  const pickupCityState = extractCityState(pickupLoc, (order as any)._fullOrder || order, 'shipper');
                  const deliveryCityState = extractCityState(deliveryLoc, (order as any)._fullOrder || order, 'receiver');
                  const shipDateTime = formatDateAndTime(order.pickupDate || '');
                  const receiveDateTime = formatDateAndTime(order.deliveryDate || '');




                  // Get load number
                  const loadNumber = getLoadNumber(order);

                  // Get order number (prefer customer order number)
                  const orderNumber = order.custOrderNo || order.orderNo || '-';

                  // Get rate - prefer rate field, fallback to totalAmount
                  const rateValue = (order as any).rate !== undefined && (order as any).rate !== null && (order as any).rate !== 0
                    ? (order as any).rate
                    : (order.totalAmount ? parseFloat(order.totalAmount) : 0);
                  const rate = rateValue ? rateValue.toFixed(0) : '0';

                  // Extract actual data from order
                  const fullOrder = (order as any)._fullOrder || order;

                  // Shipper city/state - use from order data
                  const shipperCity = (order as any).shipperCity || pickupCityState.city || '-';
                  const shipperState = (order as any).shipperState || pickupCityState.state || '-';

                  // Receiver city/state - try to parse from address if not directly available
                  let receiverCity = (order as any).receiverCity || deliveryCityState.city || '-';
                  let receiverState = (order as any).receiverState || deliveryCityState.state || '-';

                  // If receiver city/state are empty, try parsing from receiver address
                  if ((receiverCity === '-' || !receiverCity) && (order as any).receiverAddress) {
                    const parsed = extractCityState((order as any).receiverAddress, null, 'receiver');
                    receiverCity = parsed.city || receiverCity;
                    receiverState = parsed.state || receiverState;
                  }

                  // Temperature
                  const tempValue = (order as any).temperature || fullOrder.temperature || '';
                  const tempUnit = (order as any).temperatureUnit || fullOrder.temperatureUnit || '';
                  const displayTemp = tempValue ? `${tempValue}${tempUnit ? ' ' + tempUnit : ''}` : '-';

                  // Hazmat
                  const hazmatValue = (order as any).hazmat !== undefined ? (order as any).hazmat : (fullOrder.additionalInfo?.HAZMAT || false);
                  const displayHazmat = hazmatValue ? 'Yes' : 'No';

                  // Booked
                  const bookedValue = (order as any).bookedForCarrier !== undefined ? (order as any).bookedForCarrier : (fullOrder.bookedForCarrier || false);
                  const displayBooked = bookedValue ? 'Yes' : '-';

                  // Entry (could be border entry or customs entry)
                  const borderInfo = (order as any).borderInfo || fullOrder.borderInfo;
                  const displayEntry = borderInfo?.portOfEntry || borderInfo?.detailsRequired ? (borderInfo.portOfEntry || 'Yes') : '-';

                  // Dispatcher
                  const dispatcherName = (order as any).dispatcher || fullOrder.dispatcher || fullOrder.dispatcherName || '-';

                  // Carrier (could be from driver assignment or separate field)
                  const carrierName = (order as any).carrier || fullOrder.carrier || fullOrder.carrierName || '-';

                  // Truck, Trailer, Driver, Co-Driver
                  const truckDisplay = order.truckNo || '-';
                  const trailerDisplay = order.trailerNo || '-';
                  const driverDisplay = order.driver || '-';
                  const coDriverDisplay = order.coDriver || '-';

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors ${selectedOrderIds.has(order.id) ? 'bg-blue-50/20' : ''}`}
                      onClick={async () => {
                        // Open sidebar in edit mode
                        try {
                          const response = await getOrderById(order.id);
                          if (response?.success && response?.data) {
                            setEditingOrder(response.data);
                            setSidebarOpen(true);
                          } else {
                            addNotification('error', response?.message || "Failed to load order details");
                          }
                        } catch (error) {
                          console.error('Error fetching order details:', error);
                          addNotification('error', "Failed to load order details. Please try again.");
                        }
                      }}
                    >
                      <td className="px-4 py-4 whitespace-nowrap w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-blue-600"
                          checked={selectedOrderIds.has(order.id)}
                          onChange={(e) => {
                            const next = new Set(selectedOrderIds);
                            if (e.target.checked) next.add(order.id);
                            else next.delete(order.id);
                            setSelectedOrderIds(next);
                          }}
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {loadNumber}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {orderNumber}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {rate}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="relative inline-flex items-center">
                          <select
                            value={order.status || 'quoted'}
                            onChange={async (e) => {
                              e.stopPropagation();
                              const newStatus = e.target.value;
                              const previousStatus = order.status || 'quoted';
                              try {
                                const res = await updateOrder(order.id, { status: newStatus });
                                if (res?.success) {
                                  addNotification('success', 'Order status updated');
                                  fetchOrders();
                                } else {
                                  addNotification('error', res?.message || 'Failed to update status');
                                  e.target.value = previousStatus;
                                }
                              } catch (err: any) {
                                console.error('Error updating status:', err);
                                addNotification('error', err?.response?.data?.message || err?.message || 'Error updating status');
                                e.target.value = previousStatus;
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={`appearance-none text-xs font-semibold rounded-full pl-3 pr-7 py-1.5 border cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent-blue)] transition-colors bg-card
                              ${order.status?.toLowerCase() === 'quoted' ? 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10' :
                                order.status?.toLowerCase() === 'planned' ? 'text-blue-400 border-blue-400/40 bg-blue-400/10' :
                                  order.status?.toLowerCase() === 'completed' ? 'text-green-400 border-green-400/40 bg-green-400/10' :
                                    order.status?.toLowerCase() === 'delivered' ? 'text-purple-400 border-purple-400/40 bg-purple-400/10' :
                                      order.status?.toLowerCase() === 'in-delivery' ? 'text-[var(--accent-blue)] border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/10' :
                                        order.status?.toLowerCase() === 'pending_review' || order.status?.toLowerCase() === 'verification_pending'
                                          ? 'text-orange-400 border-orange-400/40 bg-orange-400/10' :
                                          order.status?.toLowerCase() === 'canceled'
                                            ? 'text-red-400 border-red-400/40 bg-red-400/10' :
                                            'text-primary border-theme'
                              }`}
                          >
                            <option value="planned" className="bg-card text-primary">Planned</option>
                            <option value="quoted" className="bg-card text-primary">Quoted</option>
                            <option value="in-delivery" className="bg-card text-primary">In Delivery</option>
                            <option value="delivered" className="bg-card text-primary">Delivered</option>
                            <option value="pending_review" className="bg-card text-primary">Pending Review</option>
                            <option value="verification_pending" className="bg-card text-primary">Verification Pending</option>
                            <option value="completed" className="bg-card text-primary">Completed</option>
                            <option value="canceled" className="bg-card text-red-400">Canceled</option>
                          </select>
                          <ChevronDown className={`pointer-events-none absolute right-2 w-3 h-3 opacity-60
                            ${order.status?.toLowerCase() === 'quoted' ? 'text-yellow-400' :
                              order.status?.toLowerCase() === 'planned' ? 'text-blue-400' :
                                order.status?.toLowerCase() === 'completed' ? 'text-green-400' :
                                  order.status?.toLowerCase() === 'canceled' ? 'text-red-400' :
                                    'text-primary'
                            }`} />
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="relative inline-flex items-center">
                          <select
                            value={order.accountingStatus || 'pending'}
                            onChange={async (e) => {
                              e.stopPropagation();
                              const newStatus = e.target.value;
                              try {
                                const res = await updateOrder(order.id, { accountingStatus: newStatus });
                                if (res?.success) {
                                  addNotification('success', 'Payment status updated');
                                  fetchOrders();
                                } else {
                                  addNotification('error', 'Failed to update payment status');
                                }
                              } catch (err) {
                                console.error('Error updating payment status:', err);
                                addNotification('error', 'Error updating payment status');
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={`appearance-none text-xs font-semibold rounded-full pl-3 pr-7 py-1.5 border cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent-blue)] transition-colors bg-card
                              ${(order.accountingStatus || 'pending') === 'paid'
                                ? 'text-green-400 border-green-400/40 bg-green-400/10'
                                : (order.accountingStatus || 'pending') === 'unpaid'
                                  ? 'text-red-400 border-red-400/40 bg-red-400/10'
                                  : 'text-orange-400 border-orange-400/40 bg-orange-400/10'
                              }`}
                          >
                            <option value="pending" className="bg-card text-primary">Pending</option>
                            <option value="paid" className="bg-card text-primary">Paid</option>
                            <option value="unpaid" className="bg-card text-primary">Unpaid</option>
                          </select>
                          <ChevronDown className={`pointer-events-none absolute right-2 w-3 h-3 opacity-60
                            ${(order.accountingStatus || 'pending') === 'paid' ? 'text-green-400' :
                              (order.accountingStatus || 'pending') === 'unpaid' ? 'text-red-400' :
                                'text-orange-400'
                            }`} />
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {truncateText(order.customerName || '-', 15)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {shipperCity || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {shipperState || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {shipDateTime.date || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {shipDateTime.time || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {receiverCity || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {receiverState || '-'}
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm ${receiveDateTime.isFuture ? 'text-green-600' : 'text-primary'}`}>
                        {receiveDateTime.date || '-'}
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm ${receiveDateTime.isFuture ? 'text-green-600' : 'text-primary'}`}>
                        {receiveDateTime.time || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {truckDisplay}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {trailerDisplay}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {driverDisplay}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {coDriverDisplay}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {displayBooked}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {displayEntry}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {displayTemp}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {displayHazmat}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {dispatcherName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {driverDisplay}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {(order as any).driverAcceptanceStatus === 'accepted' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-[var(--accent-green)]/10 text-[var(--accent-green)]" title="Driver accepted this assignment">
                            <FaCheckCircle size={10} /> Accepted
                          </span>
                        ) : (order as any).driverAcceptanceStatus === 'rejected' ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 cursor-help"
                            title={(order as any).driverRejectionReason ? `Reason: ${(order as any).driverRejectionReason}` : 'Driver rejected this assignment'}
                          >
                            <FaTimes size={10} /> Rejected
                          </span>
                        ) : (order as any).driver ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700" title="Awaiting driver response">
                            <FaExclamationCircle size={10} /> Pending
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {carrierName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {(() => {
                          // Get actual attachment count from order
                          const attachmentCount = order.attachments?.length || 0;

                          console.log(`📎 Order ${order.orderNo} - Attachments:`, order.attachments, 'Count:', attachmentCount);

                          return (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const response = await getOrderById(order.id);
                                  console.log('📄 getOrderById response:', response);
                                  if (response?.success) {
                                    const orderData = response.data;
                                    console.log('📄 Order data:', orderData);
                                    console.log('📎 Attachments:', orderData?.attachments);
                                    console.log('📋 Document Verification:', orderData?.documentVerification);
                                    setSelectedOrderForDocuments(orderData as any);
                                    setShowDocumentsModal(true);
                                  } else {
                                    addNotification('error', 'Failed to load order documents');
                                  }
                                } catch (error: any) {
                                  console.error('❌ Error loading documents:', error);
                                  addNotification('error', 'Error loading documents');
                                }
                              }}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-card hover:bg-blue-50 border border-theme rounded transition-colors cursor-pointer"
                              title={`Click to view ${attachmentCount} document${attachmentCount !== 1 ? 's' : ''}`}
                            >
                              <File className={attachmentCount > 0 ? "text-[#00D1FF]" : "text-secondary"} size={16} />
                              <span className={`text-sm font-semibold ${attachmentCount > 0 ? 'text-blue-800' : 'text-secondary'}`}>
                                {attachmentCount}
                              </span>
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-theme flex items-center justify-between">
          <div className="text-sm text-primary">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-theme rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.03)]"
            >
              Previous
            </button>
            <span className="px-3 py-1 !text-white rounded text-sm shadow-md" style={{ background: PRIMARY_GRADIENT }}>{currentPage}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-theme rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.03)]"
            >
              Next
            </button>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-theme rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Modal */}
      {showDocumentsModal && selectedOrderForDocuments && (
        <div className="fixed inset-0 z-[10002] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex-shrink-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-primary">Order Documents</h3>
                <p className="text-sm text-secondary mt-1">Order: {selectedOrderForDocuments.orderNo || selectedOrderForDocuments.custOrderNo || 'N/A'}</p>
              </div>
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedOrderForDocuments(null);
                }}
                className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {/* Document Requirements Status */}
              <div className="mb-4 p-3 bg-card rounded-lg border border-theme">
                <div className="text-xs font-semibold text-primary mb-2">Required Documents:</div>
                {(() => {
                  const orderData = selectedOrderForDocuments as any;
                  const attachments = orderData?.attachments || [];

                  console.log('📋 Modal - Order Data:', orderData);
                  console.log('📎 Modal - Attachments:', attachments);
                  console.log('📎 Modal - Attachments length:', attachments.length);

                  // Check for POD
                  const hasPOD = attachments.some((att: any) =>
                    att.type === 'pod' ||
                    att.type === 'proof_of_delivery' ||
                    att.name?.toLowerCase().includes('pod')
                  );

                  // Check for Manifest
                  const hasManifest = attachments.some((att: any) =>
                    att.type === 'border_manifest' ||
                    att.type === 'manifest' ||
                    att.type === 'stamped_manifest' ||
                    att.name?.toLowerCase().includes('manifest')
                  );

                  console.log('✅ Has POD:', hasPOD);
                  console.log('✅ Has Manifest:', hasManifest);

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        {hasPOD ? (
                          <FaCheckCircle className="text-green-600" size={14} />
                        ) : (
                          <FaTimes className="text-[#A855F7]" size={14} />
                        )}
                        <span className={hasPOD ? 'text-green-800' : 'text-red-800'}>
                          POD (Proof of Delivery) - {hasPOD ? 'Uploaded' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {hasManifest ? (
                          <FaCheckCircle className="text-green-600" size={14} />
                        ) : (
                          <FaTimes className="text-[#A855F7]" size={14} />
                        )}
                        <span className={hasManifest ? 'text-green-800' : 'text-red-800'}>
                          Border Manifest - {hasManifest ? 'Uploaded' : 'Missing'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Documents List */}
              <div>
                <div className="text-sm font-semibold text-primary mb-3">Uploaded Documents:</div>
                {(() => {
                  const orderData = selectedOrderForDocuments as any;
                  const attachments = orderData?.attachments || [];

                  console.log('📄 Uploaded Documents Section - Attachments:', attachments);
                  console.log('📄 Uploaded Documents Section - Count:', attachments.length);

                  if (attachments.length > 0) {
                    console.log('✅ Showing attachments list');
                    return (
                      <div className="space-y-2">
                        {attachments.map((attachment: any, index: number) => {
                          console.log(`📎 Rendering attachment ${index}:`, attachment);
                          const docType = attachment.type || 'other';
                          const docName = attachment.name || 'Document';
                          const docUrl = attachment.url;

                          let displayName = docName;
                          let typeLabel = docType.toUpperCase();

                          if (docType === 'pod' || docType === 'proof_of_delivery') {
                            displayName = 'Proof of Delivery (POD)';
                            typeLabel = 'POD';
                          } else if (docType === 'border_manifest' || docType === 'manifest' || docType === 'stamped_manifest') {
                            displayName = 'Border Manifest';
                            typeLabel = 'Manifest';
                          }

                          return (
                            <div key={attachment.id || index} className="p-3 bg-card border border-theme rounded-lg">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <File className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-sm text-primary">{displayName}</span>
                                      <span className="px-2 py-0.5 bg-card text-primary rounded text-xs font-medium">{typeLabel}</span>
                                    </div>
                                    <div className="text-xs text-secondary mt-1">{docName}</div>
                                    {attachment.uploadedAt && (
                                      <div className="text-xs text-secondary mt-1">
                                        Uploaded: {new Date(attachment.uploadedAt).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (docUrl) {
                                      console.log('🔗 Opening document with pre-signed URL');
                                      window.open(docUrl, '_blank', 'noopener,noreferrer');
                                    } else {
                                      alert('Document URL not available');
                                    }
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium text-[#00D1FF] hover:text-blue-700 hover:bg-blue-50 rounded border border-blue-200 transition-colors flex items-center gap-1 flex-shrink-0"
                                  title="View Document in New Tab"
                                >
                                  <Download className="w-3 h-3" />
                                  View
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return (
                    <div className="p-4 bg-card border border-theme rounded-lg text-center text-secondary">
                      <File className="w-6 h-6 mx-auto mb-2 text-secondary" />
                      <p className="text-sm">No documents uploaded</p>
                    </div>
                  );
                })()}
              </div>

              {/* Document Approval Section */}
              {(() => {
                const orderData = selectedOrderForDocuments as any;
                const isNotCompleted = orderData?.status !== 'completed';
                const isNotApproved = !orderData?.documentsApproved;
                const shouldShow = isNotCompleted && isNotApproved;

                if (!shouldShow) {
                  // Show approval status if approved
                  if (orderData?.documentsApproved) {
                    return (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-green-800">
                          <FaCheckCircle className="text-green-600" size={16} />
                          <span className="font-semibold">
                            Documents {orderData.approvedWithoutDocuments ? 'Approved (Without Documents)' : 'Approved'}
                          </span>
                        </div>
                        {orderData.documentsApprovedBy && (
                          <div className="text-xs text-green-700 mt-1">
                            Approved by {orderData.documentsApprovedBy.name || 'Dispatcher'}
                            {orderData.documentsApprovedAt && (
                              <span> on {new Date(orderData.documentsApprovedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }

                const attachments = orderData?.attachments || [];
                const hasDocuments = attachments.length > 0;

                return (
                  <div className="mt-4 p-4 bg-card border border-yellow-200 rounded-lg">
                    <div className="text-sm font-semibold text-primary mb-3">Document Approval</div>
                    <button
                      onClick={async () => {
                        if (!orderData?._id) return;
                        try {
                          const response = await approveOrderDocuments(orderData._id, false);
                          if (response?.success) {
                            // Refresh order data
                            const updatedOrder = await getOrderById(orderData._id);
                            if (updatedOrder?.success && updatedOrder?.data) {
                              setSelectedOrderForDocuments(updatedOrder.data);
                            }
                            // Refresh orders list
                            fetchOrders();
                            // Show success notification
                            alert('Documents approved successfully. Order can now be completed.');
                          } else {
                            alert(response?.message || 'Failed to approve documents');
                          }
                        } catch (error: any) {
                          alert(error?.message || 'An error occurred while approving documents');
                        }
                      }}
                      disabled={!hasDocuments}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${hasDocuments
                        ? 'bg-green-600 !text-white hover:bg-green-700 hover:shadow-md cursor-pointer'
                        : 'bg-gray-300 text-secondary cursor-not-allowed'
                        }`}
                      title={!hasDocuments ? 'No documents to approve' : 'Approve Documents'}
                    >
                      Approve Documents
                    </button>
                  </div>
                );
              })()}
            </div>
            <div className="flex-shrink-0 bg-card px-6 py-4 flex justify-end border-t rounded-b-xl">
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedOrderForDocuments(null);
                }}
                className="px-6 py-2 !text-white rounded-lg font-medium transition-all hover:opacity-90 hover:shadow-md"
                style={{ background: PRIMARY_GRADIENT }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[10003] flex flex-col gap-2">
        {notifications.map((notification) => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
            onChatClick={handleChatNotificationClick}
            onDocumentClick={handleDocumentNotificationClick}
          />
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, orderId: null })}
        onConfirm={confirmDeleteOrder}
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
      {/* Order Details Sidebar */}
      {showOrderDetails && selectedOrder && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => {
              setShowOrderDetails(false);
              setTimeout(() => setSelectedOrder(null), 300);
            }}
          ></div>

          {/* Sidebar Panel */}
          <div
            className={`fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-card shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 translate-x-0`}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-theme">
                <h2 className="text-2xl font-bold text-primary">Order Details</h2>
                <button
                  onClick={() => {
                    setShowOrderDetails(false);
                    setTimeout(() => setSelectedOrder(null), 300);
                  }}
                  className="p-2 rounded-lg text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Header */}
                <div className="bg-gradient-to-r from-[#4A90E2] to-[#357ABD] text-white p-6 rounded-lg">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">
                        Order #{selectedOrder.orderNo}
                      </h3>
                      {selectedOrder.custOrderNo && (
                        <p className="text-blue-100 text-sm">
                          Customer Order: <span className="font-semibold">{selectedOrder.custOrderNo}</span>
                        </p>
                      )}
                      {selectedOrder.tripNo && (
                        <p className="text-blue-100 text-sm mt-1">
                          Trip: <span className="font-semibold">{selectedOrder.tripNo}</span>
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(selectedOrder.status)}`}
                      style={getStatusStyle(selectedOrder.status)}
                    >
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>

                {/* Order Information */}
                <div className="bg-card p-6 rounded-lg border border-theme">
                  <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                    <Package size={20} className="text-[#00D1FF]" />
                    Order Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-secondary mb-1">Order Number</p>
                      <p className="font-medium text-primary">{selectedOrder.orderNo}</p>
                    </div>
                    {selectedOrder.custOrderNo && (
                      <div>
                        <p className="text-sm text-secondary mb-1">Customer Order Number</p>
                        <p className="font-medium text-primary">{selectedOrder.custOrderNo}</p>
                      </div>
                    )}
                    {selectedOrder.orderDate && (
                      <div>
                        <p className="text-sm text-secondary mb-1">Order Date</p>
                        <p className="font-medium text-primary">{selectedOrder.orderDate}</p>
                      </div>
                    )}
                    {selectedOrder.orderType && (
                      <div>
                        <p className="text-sm text-secondary mb-1">Order Type</p>
                        <p className="font-medium text-primary">{selectedOrder.orderType}</p>
                      </div>
                    )}
                    {selectedOrder.totalItems !== undefined && (
                      <div>
                        <p className="text-sm text-secondary mb-1">Total Items</p>
                        <p className="font-medium text-primary">{selectedOrder.totalItems}</p>
                      </div>
                    )}
                    {selectedOrder.companyName && (
                      <div>
                        <p className="text-sm text-secondary mb-1">Company Name</p>
                        <p className="font-medium text-primary">{selectedOrder.companyName}</p>
                      </div>
                    )}
                    {selectedOrder.customerName && (
                      <div>
                        <p className="text-sm text-secondary mb-1">Customer Name</p>
                        <p className="font-medium text-primary">{selectedOrder.customerName}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Details */}
                {selectedOrder.totalAmount && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                      <DollarSign size={20} className="text-[#00D1FF]" />
                      Financial Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-secondary mb-1">Total Amount</p>
                        <p className="font-bold text-2xl text-blue-700">
                          {selectedOrder.currency || 'CAD'} {selectedOrder.totalAmount}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pickup Information */}
                {(selectedOrder.pickupDate || selectedOrder.pickupLocation || selectedOrder.pickupRefNo) && (
                  <div className="bg-card p-6 rounded-lg border border-theme">
                    <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                      <Route size={20} className="text-[#00D1FF]" />
                      Pickup Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedOrder.pickupDate && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Pickup Date</p>
                          <p className="font-medium text-primary">{selectedOrder.pickupDate}</p>
                        </div>
                      )}
                      {selectedOrder.pickupLocation && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-secondary mb-1 flex items-center gap-1">
                            <Route size={14} className="text-[#00D1FF]" />
                            Pickup Location
                          </p>
                          <p className="font-medium text-primary">{selectedOrder.pickupLocation}</p>
                        </div>
                      )}
                      {selectedOrder.pickupRefNo && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Reference Number</p>
                          <p className="font-medium text-primary">{selectedOrder.pickupRefNo}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Delivery Information */}
                {(selectedOrder.deliveryDate || selectedOrder.deliveryLocation || selectedOrder.deliveryRefNo) && (
                  <div className="bg-card p-6 rounded-lg border border-theme">
                    <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                      <Route size={20} className="text-green-600" />
                      Delivery Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedOrder.deliveryDate && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Delivery Date</p>
                          <p className="font-medium text-primary">{selectedOrder.deliveryDate}</p>
                        </div>
                      )}
                      {selectedOrder.deliveryLocation && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-secondary mb-1 flex items-center gap-1">
                            <Route size={14} className="text-green-600" />
                            Delivery Location
                          </p>
                          <p className="font-medium text-primary">{selectedOrder.deliveryLocation}</p>
                        </div>
                      )}
                      {selectedOrder.deliveryRefNo && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Reference Number</p>
                          <p className="font-medium text-primary">{selectedOrder.deliveryRefNo}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Driver & Vehicle Information */}
                {(selectedOrder.driver || selectedOrder.truckNo || selectedOrder.trailerNo) && (
                  <div className="bg-card p-6 rounded-lg border border-theme">
                    <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                      <Truck size={20} className="text-[#00D1FF]" />
                      Driver & Vehicle Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedOrder.driver && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Driver</p>
                          <p className="font-medium text-primary">{selectedOrder.driver}</p>
                        </div>
                      )}
                      {selectedOrder.truckNo && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Truck Number</p>
                          <p className="font-medium text-primary">{selectedOrder.truckNo}</p>
                        </div>
                      )}
                      {selectedOrder.trailerNo && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Trailer Number</p>
                          <p className="font-medium text-primary">{selectedOrder.trailerNo}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t-2 border-theme">
                  <button
                    onClick={() => {
                      setShowOrderDetails(false);
                      setTimeout(() => setSelectedOrder(null), 300);
                    }}
                    className="px-6 py-2.5 bg-gray-200 text-primary font-medium rounded-lg hover:bg-gray-300 transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditOrder(selectedOrder);
                      setShowOrderDetails(false);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#4A90E2] to-[#357ABD] !text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    <Edit size={18} />
                    Edit Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {sidebarOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/50"
              style={{ zIndex: 99999 }}
              onClick={() => setSidebarOpen(false)}
            />
            <div
              className="fixed top-0 right-0 h-screen w-full max-w-5xl bg-card"
              style={{ zIndex: 100000 }}
            >
              <NewOrderSidebar
                order={editingOrder}
                onClose={() => {
                  setSidebarOpen(false);
                  setEditingOrder(null);
                }}
                onSave={handleSaveOrder}
              />
            </div>
          </>,
          document.body
        )
      }

      {/* Order Chat Modal */}
      {showChat && chatOrderId &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/50"
              style={{ zIndex: 99999 }}
              onClick={() => {
                setShowChat(false);
                setChatOrderId(null);
                setChatOrderNumber("");
                // Remove orderId from URL
                navigate(location.pathname, { replace: true });
              }}
            />
            <div
              className="fixed top-0 right-0 h-screen w-full max-w-3xl bg-card shadow-2xl"
              style={{ zIndex: 100000 }}
            >
              <OrderChat
                orderId={chatOrderId}
                orderNumber={chatOrderNumber}
                onClose={() => {
                  setShowChat(false);
                  setChatOrderId(null);
                  setChatOrderNumber("");
                  // Remove orderId from URL
                  navigate(location.pathname, { replace: true });
                  // Refresh unread count for this order
                  getOrderUnreadMessageCount(chatOrderId).then((response: any) => {
                    if (response?.success && response?.data) {
                      setUnreadCounts(prev => ({ ...prev, [chatOrderId]: response.data.unreadCount }));
                    }
                  });
                }}
              />
            </div>
          </>,
          document.body
        )
      }


    </div>
  );
};

export default OrderList;
