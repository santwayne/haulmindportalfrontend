import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X, Send, ArrowLeft, Search, Users, PenSquare, CheckCircle2, AlertCircle } from 'lucide-react';
import { socketService } from '../../services/socketService';
import { useChat } from '../../contexts/ChatContext';
import { listDriver } from '../../axios/api/distapcher';
import {
  getDriverChatMessages,
  sendDriverChatMessage,
  markDriverMessagesAsRead,
  getDriversLastMessages,
  broadcastDriverMessage,
  getChatMessageFileSignedUrl,
  type ChatMessage,
} from '../../axios/api/chat';
import { getUserRole } from '../../utils/auth';
import { OPEN_DRIVER_MESSENGER, type OpenDriverMessengerDetail } from './driverMessengerEvents';
import { playMessageSound, showBrowserNotification, unlockMessageAlerts } from '../../utils/messageAlert';

// Global driver messenger for every staff department (HR, Accounts, Fleet, Compliance,
// Safety, Mechanics, Admin, Dispatch...):
//  - pop-up, sound and background-tab notification whenever a driver sends a message
//    from the mobile app (the only place that handles these alerts and the unread count)
//  - side panel with 1-to-1 chats per driver
//  - "Compose" to message all drivers or a selected group at once

interface DriverRow {
  _id: string;
  name: string;
  phone?: string;
  lastMessage?: { message?: string; fileUrl?: string; senderType?: string; createdAt?: string } | null;
  unreadCount?: number;
}

interface Toast {
  id: number;
  driverId: string;
  driverName: string;
  text: string;
}

const PUBLIC_PREFIXES = ['/superadmin', '/forgot-password', '/reset-password', '/accept-invite', '/invoice'];

const idOf = (v: unknown): string => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && '_id' in v) return String((v as { _id: unknown })._id);
  return String(v);
};

const timeLabel = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const DriverMessenger = () => {
  const { pathname } = useLocation();
  const chat = useChat();
  const role = getUserRole();
  const token = localStorage.getItem('token');
  const enabled = !!token && !!role && role !== 'driver' && role !== 'superadmin'
    && pathname !== '/' && !PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'chats' | 'compose'>('chats');
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [search, setSearch] = useState('');
  const [activeDriver, setActiveDriver] = useState<DriverRow | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [driversError, setDriversError] = useState('');
  const [messagesError, setMessagesError] = useState('');
  const [sendError, setSendError] = useState('');

  // Compose (group message)
  const [composeAll, setComposeAll] = useState(true);
  const [composeSelected, setComposeSelected] = useState<string[]>([]);
  const [composeText, setComposeText] = useState('');
  const [composeSearch, setComposeSearch] = useState('');
  const [composeResult, setComposeResult] = useState<{ ok: boolean; text: string } | null>(null);

  const activeDriverIdRef = useRef<string | null>(null);
  const openRef = useRef(false);
  const driversRef = useRef<DriverRow[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const openConversationRef = useRef<(driver: DriverRow) => void>(() => {});
  useEffect(() => { activeDriverIdRef.current = activeDriver?._id || null; }, [activeDriver]);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { driversRef.current = drivers; }, [drivers]);

  // ── Load drivers + last messages ────────────────────────────────────────────
  const loadDrivers = useCallback(async () => {
    setLoadingDrivers(true);
    try {
      const [dRes, lRes] = await Promise.all([listDriver({ limit: 500 }), getDriversLastMessages()]);
      if (!dRes?.success) {
        setDriversError(dRes?.message || 'Could not load drivers. Please try again.');
        return;
      }
      setDriversError('');
      const list: DriverRow[] = (dRes?.success ? dRes.data || [] : [])
        .filter((d: { role?: string }) => !d.role || d.role === 'driver')
        .map((d: { _id: string; name?: string; phone?: string }) => ({ _id: d._id, name: d.name || 'Driver', phone: d.phone }));
      const last = new Map((lRes?.success ? lRes.data : []).map((r) => [String(r.driverId), r]));
      const merged = list.map((d) => ({ ...d, lastMessage: last.get(d._id)?.lastMessage || null, unreadCount: last.get(d._id)?.unreadCount || 0 }));
      setDrivers(merged);
      const counts: Record<string, number> = {};
      merged.forEach((d) => { if (d.unreadCount) counts[d._id] = d.unreadCount; });
      chat?.setInitialUnreadCounts?.(counts);
    } catch (e) {
      console.error('Driver messenger: failed to load drivers', e);
      setDriversError('Could not load drivers. Please try again.');
    } finally {
      setLoadingDrivers(false);
    }
  }, [chat]);

  // Unread badge on first load (once per login)
  useEffect(() => {
    if (enabled) loadDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Browsers only allow sound and the notification prompt after a user interaction
  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('pointerdown', unlockMessageAlerts);
    window.addEventListener('keydown', unlockMessageAlerts);
    return () => {
      window.removeEventListener('pointerdown', unlockMessageAlerts);
      window.removeEventListener('keydown', unlockMessageAlerts);
    };
  }, [enabled]);

  // ── Real-time: driver messages → notification + live chat ──────────────────
  const dismissToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const handleIncoming = useCallback((msg: ChatMessage) => {
    const driverId = idOf(msg?.driverId);
    if (!driverId) return;
    // Automatic trip status updates are not chat messages
    if (msg.isSystemMessage || msg.senderType === 'system') return;

    // Live update of the open conversation (both driver and staff messages)
    if (activeDriverIdRef.current === driverId) {
      setMessages((prev) => (prev.some((m) => idOf(m._id) === idOf(msg._id)) ? prev : [...prev, msg]));
      if (msg.senderType === 'driver' && openRef.current) markDriverMessagesAsRead(driverId).catch(() => {});
    }

    // Keep the driver list order / preview fresh
    setDrivers((prev) => prev.map((d) => (d._id === driverId
      ? { ...d, lastMessage: { message: msg.message, fileUrl: msg.fileUrl, senderType: msg.senderType, createdAt: msg.createdAt } }
      : d)));

    if (msg.senderType !== 'driver') return;
    const viewingThisChat = openRef.current && activeDriverIdRef.current === driverId;
    if (viewingThisChat) return;
    if (chat?.activeDriverId === driverId) return;
    chat?.addUnread?.(driverId);

    const name = msg.senderName || driversRef.current.find((d) => d._id === driverId)?.name || 'Driver';
    const text = msg.message || '📎 Sent an attachment';
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, driverId, driverName: name, text }]);
    // Keep the pop-up until dismissed if nobody is looking at this tab
    if (!document.hidden) window.setTimeout(() => dismissToast(id), 8000);

    playMessageSound();
    showBrowserNotification({
      title: `New message from ${name}`,
      body: text,
      tag: `driver-message-${idOf(msg._id) || id}`,
      onClick: () => {
        setOpen(true);
        openConversationRef.current(driversRef.current.find((d) => d._id === driverId) || { _id: driverId, name });
      },
    });
  }, [chat]);

  useEffect(() => {
    if (!enabled) return;
    let attached = false;
    const attach = () => {
      if (attached || !socketService.getSocket()) return;
      socketService.onNewMessage(handleIncoming);
      attached = true;
    };
    attach();
    const onReady = () => {
      if (attached) socketService.offNewMessage(handleIncoming);
      attached = false;
      attach();
      // A reconnect drops the chat room and may have missed messages
      const openDriverId = activeDriverIdRef.current;
      if (openDriverId) {
        socketService.joinDriverChat(openDriverId).catch(() => {});
        getDriverChatMessages(openDriverId, 1, 100)
          .then((res) => {
            if (activeDriverIdRef.current !== openDriverId || !res?.success) return;
            setMessages((res.data?.messages || []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
          })
          .catch(() => {});
      }
    };
    window.addEventListener('socket-ready', onReady);
    const retry = window.setInterval(attach, 2000);
    return () => {
      window.removeEventListener('socket-ready', onReady);
      window.clearInterval(retry);
      socketService.offNewMessage(handleIncoming);
    };
  }, [enabled, handleIncoming]);

  // ── Open / close ───────────────────────────────────────────────────────────
  const openConversation = useCallback(async (driver: DriverRow) => {
    setToasts((t) => t.filter((x) => x.driverId !== driver._id));
    setMode('chats');
    setActiveDriver(driver);
    chat?.setActiveDriverId?.(driver._id);
    setMessages([]);
    setMessagesError('');
    setSendError('');
    setLoadingMessages(true);
    try {
      socketService.joinDriverChat?.(driver._id)?.catch?.(() => {});
      const res = await getDriverChatMessages(driver._id, 1, 100);
      if (!res?.success) {
        setMessagesError(res?.message || 'Could not load messages. Please try again.');
        return;
      }
      const list = (res?.data?.messages || []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(list);
      await markDriverMessagesAsRead(driver._id);
      chat?.clearUnread?.(driver._id);
      setDrivers((prev) => prev.map((d) => (d._id === driver._id ? { ...d, unreadCount: 0 } : d)));
    } catch (e) {
      console.error('Driver messenger: failed to load messages', e);
      setMessagesError('Could not load messages. Please try again.');
    } finally {
      setLoadingMessages(false);
    }
  }, [chat]);

  useEffect(() => { openConversationRef.current = openConversation; }, [openConversation]);

  const closeConversation = useCallback(() => {
    if (activeDriver) socketService.leaveDriverChat?.(activeDriver._id);
    setActiveDriver(null);
    chat?.setActiveDriverId?.(null);
  }, [activeDriver, chat]);

  const closePanel = useCallback(() => {
    closeConversation();
    setOpen(false);
  }, [closeConversation]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenDriverMessengerDetail>).detail || {};
      setOpen(true);
      setComposeResult(null);
      loadDrivers();
      if (detail.mode === 'compose') { closeConversation(); setMode('compose'); return; }
      if (detail.driverId) {
        const d = driversRef.current.find((x) => x._id === detail.driverId) || { _id: detail.driverId, name: 'Driver' };
        openConversation(d);
      } else {
        setMode('chats');
      }
    };
    window.addEventListener(OPEN_DRIVER_MESSENGER, onOpen);
    return () => window.removeEventListener(OPEN_DRIVER_MESSENGER, onOpen);
  }, [loadDrivers, openConversation, closeConversation]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const sendOne = async () => {
    const text = draft.trim();
    if (!text || !activeDriver || sending) return;
    setSending(true);
    setSendError('');
    try {
      const res = await sendDriverChatMessage(activeDriver._id, text);
      if (res?.success && res.data) {
        setMessages((prev) => (prev.some((m) => idOf(m._id) === idOf(res.data!._id)) ? prev : [...prev, res.data!]));
        setDraft('');
      } else {
        setSendError(res?.message || 'Message not sent. Please try again.');
      }
    } catch (e) {
      console.error('Driver messenger: failed to send message', e);
      setSendError('Message not sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const sendGroup = async () => {
    const text = composeText.trim();
    if (!text || sending) return;
    if (!composeAll && composeSelected.length === 0) {
      setComposeResult({ ok: false, text: 'Select at least one driver.' });
      return;
    }
    setSending(true);
    setComposeResult(null);
    try {
      const res = await broadcastDriverMessage(composeAll ? { message: text, allDrivers: true } : { message: text, driverIds: composeSelected });
      setComposeResult({ ok: !!res?.success, text: res?.message || (res?.success ? 'Sent' : 'Failed to send') });
      if (res?.success) { setComposeText(''); setComposeSelected([]); loadDrivers(); }
    } catch (e) {
      console.error('Driver messenger: failed to send group message', e);
      setComposeResult({ ok: false, text: 'Message not sent. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  const openAttachment = async (messageId: string) => {
    setMessagesError('');
    // Open the tab first: browsers block pop-ups opened after an await
    const tab = window.open('', '_blank');
    try {
      const res = await getChatMessageFileSignedUrl(messageId, 'inline');
      const url = res?.url;
      if (!url) throw new Error('No file link returned');
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (e) {
      tab?.close();
      console.error('Driver messenger: failed to open attachment', e);
      setMessagesError('Could not open the attachment. Please try again.');
    }
  };

  const filteredDrivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers
      .filter((d) => !q || d.name.toLowerCase().includes(q) || (d.phone || '').includes(q))
      .slice()
      .sort((a, b) => {
        const ua = chat?.unreadCounts?.[a._id] || 0, ub = chat?.unreadCounts?.[b._id] || 0;
        if (ua !== ub) return ub - ua;
        const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        if (ta !== tb) return tb - ta;
        return a.name.localeCompare(b.name);
      });
  }, [drivers, search, chat?.unreadCounts]);

  const composeDrivers = useMemo(() => {
    const q = composeSearch.trim().toLowerCase();
    return drivers.filter((d) => !q || d.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  }, [drivers, composeSearch]);

  if (!enabled) return null;

  const myId = (() => {
    try { const u = JSON.parse(localStorage.getItem('userInfo') || '{}'); return String(u?.userData?._id || u?.userData?.id || ''); } catch { return ''; }
  })();

  return (
    <>
      {/* ── Pop-up notifications ── */}
      <div className={`fixed top-20 z-[10050] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] ${open ? 'right-4 sm:right-[416px]' : 'right-4'}`}>
        {toasts.map((t) => (
          <div key={t.id} className="bg-card border border-theme rounded-xl shadow-2xl p-3 flex gap-3 items-start animate-[fadeIn_0.2s_ease-out]">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: 'var(--accent-navyblue)' }}>
              {t.driverName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-secondary">New message from driver</p>
              <p className="font-semibold text-primary text-sm truncate">{t.driverName}</p>
              <p className="text-secondary text-sm mt-0.5 line-clamp-2 break-words">{t.text}</p>
              <button
                onClick={() => { dismissToast(t.id); setOpen(true); openConversation(drivers.find((d) => d._id === t.driverId) || { _id: t.driverId, name: t.driverName }); }}
                className="mt-2 text-xs font-semibold px-3 py-1 rounded-md text-white"
                style={{ backgroundColor: 'var(--accent-navyblue)' }}
              >
                Reply
              </button>
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-secondary hover:text-primary" aria-label="Dismiss"><X size={16} /></button>
          </div>
        ))}
      </div>

      {/* ── Side panel ── */}
      {open && (
        <div className="fixed inset-0 z-[10040]" onClick={closePanel}>
          <div className="absolute inset-0 bg-black/30" />
          <aside
            className="absolute right-0 top-0 h-full w-full sm:w-[400px] bg-card border-l border-theme shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
              <div className="flex items-center gap-2 min-w-0">
                {activeDriver && mode === 'chats' ? (
                  <button onClick={closeConversation} className="header-btn" title="Back"><ArrowLeft size={18} /></button>
                ) : (
                  <MessageSquare size={18} style={{ color: 'var(--accent-navyblue)' }} />
                )}
                <h2 className="font-semibold text-primary truncate">
                  {activeDriver && mode === 'chats' ? activeDriver.name : mode === 'compose' ? 'Message drivers' : 'Driver messages'}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {!(activeDriver && mode === 'chats') && (
                  <button
                    onClick={() => { setMode(mode === 'compose' ? 'chats' : 'compose'); setComposeResult(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: 'var(--accent-navyblue)' }}
                    title={mode === 'compose' ? 'Back to chats' : 'Compose message to all / selected drivers'}
                  >
                    {mode === 'compose' ? <><MessageSquare size={14} /> Chats</> : <><PenSquare size={14} /> Compose</>}
                  </button>
                )}
                <button onClick={closePanel} className="header-btn" title="Close"><X size={18} /></button>
              </div>
            </div>

            {/* Chats list */}
            {mode === 'chats' && !activeDriver && (
              <>
                <div className="p-3 border-b border-theme">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search drivers..."
                      className="pl-9 pr-3 py-2 w-full border border-theme rounded-lg bg-main text-sm text-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadingDrivers && drivers.length === 0 ? (
                    <p className="text-center text-secondary text-sm py-10">Loading drivers...</p>
                  ) : driversError && drivers.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <p className="text-red-500 text-sm">{driversError}</p>
                      <button onClick={loadDrivers} className="mt-2 text-sm font-medium text-primary underline">Try again</button>
                    </div>
                  ) : filteredDrivers.length === 0 ? (
                    <p className="text-center text-secondary text-sm py-10">No drivers found</p>
                  ) : filteredDrivers.map((d) => {
                    const unread = chat?.unreadCounts?.[d._id] || 0;
                    return (
                      <button key={d._id} onClick={() => openConversation(d)} className="w-full flex items-center gap-3 px-4 py-3 border-b border-theme text-left hover:bg-[rgba(15,31,23,0.04)]">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: 'var(--accent-navyblue)' }}>
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm truncate ${unread ? 'font-bold text-primary' : 'font-medium text-primary'}`}>{d.name}</p>
                            <span className="text-[11px] text-secondary flex-shrink-0">{timeLabel(d.lastMessage?.createdAt)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-secondary truncate">
                              {d.lastMessage ? `${d.lastMessage.senderType === 'driver' ? '' : 'You/Office: '}${d.lastMessage.message || (d.lastMessage.fileUrl ? '📎 Attachment' : '')}` : 'No messages yet'}
                            </p>
                            {unread > 0 && (
                              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Conversation */}
            {mode === 'chats' && activeDriver && (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-main">
                  {messagesError && (
                    <p className="text-center text-red-500 text-sm">{messagesError}</p>
                  )}
                  {loadingMessages ? (
                    <p className="text-center text-secondary text-sm py-10">Loading messages...</p>
                  ) : messages.length === 0 && !messagesError ? (
                    <p className="text-center text-secondary text-sm py-10">No messages yet. Say hello 👋</p>
                  ) : messages.filter((m) => !m.isSystemMessage).map((m) => {
                    const mine = m.senderType !== 'driver';
                    const byMe = mine && idOf(m.senderId) === myId;
                    return (
                      <div key={idOf(m._id)} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? 'text-white rounded-br-sm' : 'bg-card text-primary border border-theme rounded-bl-sm'}`}
                          style={mine ? { backgroundColor: 'var(--accent-navyblue)' } : undefined}>
                          {mine && !byMe && <p className="text-[10px] opacity-80 mb-0.5">{m.senderName}</p>}
                          {m.message && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
                          {m.fileUrl && (
                            <button onClick={() => openAttachment(idOf(m._id))} className="block text-left text-xs underline opacity-90">
                              📎 {m.fileName || 'Attachment'}
                            </button>
                          )}
                          <p className={`text-[10px] mt-1 ${mine ? 'opacity-75' : 'text-secondary'}`}>{timeLabel(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                {sendError && (
                  <p className="px-3 pt-2 text-sm text-red-500 flex items-center gap-1.5"><AlertCircle size={14} /> {sendError}</p>
                )}
                <div className="p-3 border-t border-theme flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendOne(); } }}
                    rows={1}
                    placeholder={`Message ${activeDriver.name}...`}
                    className="flex-1 resize-none max-h-32 px-3 py-2 border border-theme rounded-lg bg-main text-sm text-primary focus:outline-none"
                  />
                  <button onClick={sendOne} disabled={!draft.trim() || sending} className="p-2.5 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: 'var(--accent-navyblue)' }} title="Send">
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}

            {/* Compose: all or selected drivers */}
            {mode === 'compose' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 space-y-3 border-b border-theme">
                  <div className="flex gap-2">
                    <button onClick={() => setComposeAll(true)} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border ${composeAll ? 'text-white' : 'text-secondary border-theme'}`}
                      style={composeAll ? { backgroundColor: 'var(--accent-navyblue)', borderColor: 'var(--accent-navyblue)' } : undefined}>
                      <Users size={14} /> All drivers ({drivers.length})
                    </button>
                    <button onClick={() => setComposeAll(false)} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border ${!composeAll ? 'text-white' : 'text-secondary border-theme'}`}
                      style={!composeAll ? { backgroundColor: 'var(--accent-navyblue)', borderColor: 'var(--accent-navyblue)' } : undefined}>
                      Select drivers{!composeAll && composeSelected.length ? ` (${composeSelected.length})` : ''}
                    </button>
                  </div>
                  <textarea
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder={composeAll ? 'Message to all drivers (e.g. road closure, safety reminder)...' : 'Message to selected drivers...'}
                    className="w-full resize-none px-3 py-2 border border-theme rounded-lg bg-main text-sm text-primary focus:outline-none"
                  />
                  {composeResult && (
                    <p className={`text-sm flex items-center gap-1.5 ${composeResult.ok ? 'text-green-500' : 'text-red-500'}`}>
                      {composeResult.ok && <CheckCircle2 size={14} />} {composeResult.text}
                    </p>
                  )}
                  <button onClick={sendGroup} disabled={!composeText.trim() || sending || (!composeAll && composeSelected.length === 0)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50" style={{ backgroundColor: 'var(--accent-navyblue)' }}>
                    <Send size={14} /> {sending ? 'Sending...' : composeAll ? 'Send to all drivers' : `Send to ${composeSelected.length} driver${composeSelected.length === 1 ? '' : 's'}`}
                  </button>
                  <p className="text-[11px] text-secondary">Each driver gets it in their own chat on the app, so replies come back to you one-to-one.</p>
                </div>
                {!composeAll && (
                  <>
                    <div className="p-3 border-b border-theme flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                        <input value={composeSearch} onChange={(e) => setComposeSearch(e.target.value)} placeholder="Search drivers..."
                          className="pl-9 pr-3 py-2 w-full border border-theme rounded-lg bg-main text-sm text-primary focus:outline-none" />
                      </div>
                      <button
                        onClick={() => setComposeSelected(composeSelected.length === composeDrivers.length ? [] : composeDrivers.map((d) => d._id))}
                        className="text-xs text-secondary hover:text-primary whitespace-nowrap"
                      >
                        {composeSelected.length === composeDrivers.length && composeDrivers.length > 0 ? 'Clear' : 'Select all'}
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {composeDrivers.map((d) => {
                        const checked = composeSelected.includes(d._id);
                        return (
                          <label key={d._id} className="flex items-center gap-3 px-4 py-2.5 border-b border-theme cursor-pointer hover:bg-[rgba(15,31,23,0.04)]">
                            <input type="checkbox" checked={checked}
                              onChange={() => setComposeSelected(checked ? composeSelected.filter((x) => x !== d._id) : [...composeSelected, d._id])} />
                            <span className="text-sm text-primary">{d.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
};

export default DriverMessenger;
