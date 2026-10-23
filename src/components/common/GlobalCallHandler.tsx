import React, { useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Minimize2, Maximize2 } from "lucide-react";
import { socketService } from "../../services/socketService";
import { useCall } from "../../contexts/CreateCallContext";
import { sendDriverChatMessage } from "../../axios/api/chat";

export const GlobalCallHandler: React.FC = () => {
  const {
    callState, setCallState,
    incomingCall, setIncomingCall,
    isMuted, setIsMuted,
    isMinimized, setIsMinimized,
    callSeconds, setCallSeconds,
    callerName, setCallerName,
    isOnChatPage,
    registerActions,
  } = useCall();

  // WebRTC refs — live here permanently since this component never unmounts
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerSocketRef = useRef<string | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep a ref mirror so async closures always see latest incomingCall
  const incomingCallRef = useRef(incomingCall);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
  // Call-record tracking refs
  const isCallerRef       = useRef(false);        // true when WE initiated the call
  const callTargetIdRef   = useRef<string | null>(null); // driver's MongoDB _id
  const callStartTimeRef  = useRef<number | null>(null); // ms timestamp when connected
  const callStateRef      = useRef(callState);    // live mirror of callState
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  const remoteEndedRef    = useRef(false);        // true when remote party hung up (not rejected)

  const postCallRecord = (driverId: string, type: 'ended' | 'cancelled' | 'declined', durationSecs = 0) => {
    const initiated = isCallerRef.current ? 'dispatcher' : 'driver';
    const msg = JSON.stringify({ __callRecord: true, type, duration: durationSecs, initiatedBy: initiated });
    sendDriverChatMessage(driverId, msg).catch(() => {});
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Timer ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (callState === "connected") {
      setCallSeconds(0);
      timerRef.current = setInterval(() => setCallSeconds(p => p + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setCallSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState]);

  // ── Ring tone ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (callState !== "incoming") {
      if (ringIntervalRef.current) { clearInterval(ringIntervalRef.current); ringIntervalRef.current = null; }
      return;
    }
    const beep = () => {
      try {
        const ctx = new AudioContext();
        ([[440, 0, 0.35], [480, 0.4, 0.35]] as [number, number, number][]).forEach(([freq, delay, dur]) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = "sine";
          gain.gain.setValueAtTime(0, ctx.currentTime + delay);
          gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + delay + 0.02);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + delay + dur - 0.02);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + dur);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + dur);
        });
      } catch {}
    };
    beep();
    ringIntervalRef.current = setInterval(beep, 3000);
    return () => { if (ringIntervalRef.current) { clearInterval(ringIntervalRef.current); ringIntervalRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState]);

  // ── Core helpers (defined at component level — accessible from JSX) ───────────
  const playRemoteAudio = (stream: MediaStream) => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.play().catch(() => {});
    }
  };

  const stopRing = () => {
    if (ringIntervalRef.current) { clearInterval(ringIntervalRef.current); ringIntervalRef.current = null; }
  };

  const createPeer = useCallback((to: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
    pc.onicecandidate = (e) => {
      if (e.candidate) socketService.sendIceCandidate({ to, candidate: e.candidate });
    };
    pc.ontrack = (e) => { if (e.streams?.[0]) playRemoteAudio(e.streams[0]); };
    (pc as any).onaddstream = (e: any) => { if (e.stream) playRemoteAudio(e.stream); };
    pcRef.current = pc;
    return pc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = useCallback((notifyPeer = true) => {
    stopRing();
    if (notifyPeer && peerSocketRef.current) {
      socketService.getSocket()?.emit("call-end", { to: peerSocketRef.current });
    }
    // Post call record — only when WE initiated the call
    if (isCallerRef.current && callTargetIdRef.current) {
      const cs = callStateRef.current;
      const dur = callStartTimeRef.current
        ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
      if (cs === "connected") postCallRecord(callTargetIdRef.current, "ended", dur);
      else if (cs === "calling") postCallRecord(callTargetIdRef.current, "cancelled");
    }
    isCallerRef.current      = false;
    callTargetIdRef.current  = null;
    callStartTimeRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    peerSocketRef.current = null;
    setIsMuted(false);
    setIsMinimized(false);
    setCallState("idle");
    setIncomingCall(null);
    setCallerName("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setIsMuted, setIsMinimized, setCallState, setIncomingCall, setCallerName]);

  const startCall = useCallback(async (targetId: string, targetName: string) => {
    isCallerRef.current     = true;
    callTargetIdRef.current = targetId;
    callStartTimeRef.current = null;
    setCallerName(targetName);
    setCallState("calling");
    try {
      const pc = createPeer(targetId);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      peerSocketRef.current = targetId;
      socketService.callUser({ to: targetId, offer });
    } catch (err) {
      console.error("❌ Start call error:", err);
      setCallState("idle");
      setCallerName("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPeer, setCallerName, setCallState]);

  const acceptCall = useCallback(async () => {
    const incoming = incomingCallRef.current;
    if (!incoming) return;
    stopRing();
    peerSocketRef.current = incoming.from;
    try {
      const pc = createPeer(incoming.from);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(incoming.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketService.answerCall({ to: incoming.from, answer });
      callStartTimeRef.current = Date.now();
      setCallState("connected");
    } catch (err) { console.error("❌ Accept call error:", err); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPeer, setCallState]);

  const rejectCall = useCallback(() => {
    stopRing();
    if (peerSocketRef.current) {
      socketService.getSocket()?.emit("call-rejected", { to: peerSocketRef.current });
    }
    cleanup(false);
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(p => !p); }
  }, [setIsMuted]);

  // ── Register actions into context so DriverChat can trigger them ─────────────
  useEffect(() => {
    registerActions({ startCall, acceptCall, endCall: cleanup, rejectCall, toggleMute });
  }, [registerActions, startCall, acceptCall, cleanup, rejectCall, toggleMute]);

  // ── Connect socket at app-load level (Option B) ──────────────────────────────
  // GlobalCallHandler owns the connection so it never depends on DriverChat being open.
  // socketService.connect() with the same token is a no-op when already connected,
  // so DriverChat calling it later causes zero conflict.
  useEffect(() => {
    const tryConnect = () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      if (socketService.isConnected() && socketService.getIsAuthenticated()) return;
      socketService.connect(token).catch(() => {});
    };

    tryConnect(); // immediate attempt on mount

    // Retry every 2 s until authenticated (covers post-login case where token
    // wasn't in localStorage yet at mount time)
    const interval = setInterval(() => {
      if (socketService.isConnected() && socketService.getIsAuthenticated()) {
        clearInterval(interval);
        return;
      }
      tryConnect();
    }, 2000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Socket listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    const attachListeners = (socket: ReturnType<typeof socketService.getSocket>) => {
      if (!socket) return;
      // Remove any previous listeners first so we never double-register
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("call-ice");
      socket.off("call-ended");
      socket.off("call-rejected");

      socket.on("incoming-call", ({ from, offer, driverId }: { from: string; offer: any; driverId?: string }) => {
        isCallerRef.current      = false; // we are the callee
        callTargetIdRef.current  = driverId || null;
        callStartTimeRef.current = null;
        peerSocketRef.current = from;
        setIncomingCall({ from, offer });
        setCallState("incoming");
        if ("Notification" in window && Notification.permission === "granted") {
          const n = new Notification("📞 Incoming Call", {
            body: "Driver is calling you",
            icon: "/favicon.ico",
            requireInteraction: true,
          });
          n.onclick = () => { window.focus(); n.close(); };
        }
      });

      socket.on("call-answered", ({ answer, from }: { answer: any; from?: string }) => {
        if (from) peerSocketRef.current = from;
        pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        callStartTimeRef.current = Date.now();
        setCallState("connected");
      });

      socket.on("call-ice", ({ candidate }: { candidate: any }) => {
        pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.on("call-ended", () => {
        const wasConnected = callStateRef.current === "connected";
        const wasMissed    = callStateRef.current === "incoming";
        remoteEndedRef.current = wasConnected;
        cleanup(false);
        if (wasConnected) {
          setCallState("declined");
          setTimeout(() => { remoteEndedRef.current = false; setCallState("idle"); }, 2500);
        }
        // Dispatcher missed the call — show browser notification so they can follow up
        if (wasMissed && "Notification" in window && Notification.permission === "granted") {
          new Notification("📵 Missed Call", {
            body: `${callerName || "Driver"} tried to reach you`,
            icon: "/favicon.ico",
            tag: "missed-call",
          });
        }
      });
      socket.on("call-rejected", () => {
        remoteEndedRef.current = false;
        if (isCallerRef.current && callTargetIdRef.current) {
          postCallRecord(callTargetIdRef.current, "declined");
        }
        stopRing();
        cleanup(false);
        setCallState("declined");
        setTimeout(() => setCallState("idle"), 2500);
      });
    };

    // Try immediately if socket already exists
    const existing = socketService.getSocket();
    if (existing) {
      attachListeners(existing);
    }

    // Re-attach whenever the socket (re)authenticates
    // socketService fires "socket-ready" after every successful authenticate
    const onSocketReady = () => {
      attachListeners(socketService.getSocket());
    };
    window.addEventListener("socket-ready", onSocketReady);

    // Fallback: poll every 500 ms until socket is available
    const interval = setInterval(() => {
      const s = socketService.getSocket();
      if (s) {
        attachListeners(s);
        clearInterval(interval);
      }
    }, 500);

    return () => {
      window.removeEventListener("socket-ready", onSocketReady);
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────
  const audioEl = <audio ref={remoteAudioRef} autoPlay style={{ display: "none" }} />;

  // Minimized pill — fixed position, visible on EVERY page
  if (callState === "connected" && isMinimized) {
    return (
      <>
        {audioEl}
        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border border-white/10"
          style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", minWidth: 300 }}
        >
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
            {(callerName || "D").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{callerName || "Driver"}</p>
            <p className="text-green-400 text-xs font-mono">{formatTime(callSeconds)}</p>
          </div>
          <button
            onClick={toggleMute}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isMuted ? "bg-white/30" : "bg-white/10 hover:bg-white/20"}`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
          </button>
          <button
            onClick={() => setIsMinimized(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title="Expand"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => cleanup()}
            className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors shadow-md"
            title="End call"
          >
            <PhoneOff className="w-4 h-4 text-white" />
          </button>
        </div>
      </>
    );
  }

  // On chat page with active call: DriverChat shows its panel overlay; just keep audio alive
  if (isOnChatPage && callState !== "idle" && callState !== "declined") {
    return audioEl;
  }

  // Idle or declined-on-non-chat-page with no overlay needed
  if (callState === "idle") return audioEl;

  // Full-screen overlay — shown when not on chat page
  return (
    <>
      {audioEl}
      <div
        className="fixed inset-0 z-[9999] flex flex-col"
        style={{ background: "linear-gradient(160deg,#0f0f1a 0%,#1a1a2e 50%,#16213e 100%)" }}
      >
        {callState === "declined" ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center mb-5">
              <PhoneOff className="w-10 h-10 text-red-400" />
            </div>
            <p className="text-white text-2xl font-bold mb-2">
              {remoteEndedRef.current ? "Call Ended" : "Call Declined"}
            </p>
            <p className="text-white/50 text-sm">
              {remoteEndedRef.current ? "Driver ended the call" : "The call was not accepted"}
            </p>
          </div>
        ) : (
          <>
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 pt-6 pb-3">
              <div className="w-9" />
              <p className="text-white/60 text-sm font-medium tracking-wide">
                {callState === "incoming" ? "Incoming Call" : callState === "connected" ? "On Call" : "Calling..."}
              </p>
              {callState === "connected" ? (
                <button
                  onClick={() => setIsMinimized(true)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <Minimize2 className="w-4 h-4 text-white/70" />
                </button>
              ) : <div className="w-9" />}
            </div>

            {/* Center */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className={`w-28 h-28 rounded-full bg-blue-600 flex items-center justify-center mb-6 text-white text-5xl font-bold border-4 border-white/10 shadow-[0_0_40px_rgba(25,118,210,0.4)] ${callState === "incoming" ? "animate-pulse" : ""}`}>
                {(callerName || "D").charAt(0).toUpperCase()}
              </div>
              <p className="text-white text-3xl font-bold mb-2 tracking-tight">{callerName || "Driver"}</p>
              <p className={`text-lg font-mono tracking-widest ${callState === "connected" ? "text-green-400" : "text-white/50"}`}>
                {callState === "connected" ? formatTime(callSeconds) : callState === "incoming" ? "Incoming…" : "Calling…"}
              </p>
            </div>

            {/* Bottom controls */}
            <div className="pb-12 px-8 flex flex-col items-center gap-8">
              {callState === "connected" && (
                <div className="flex gap-10 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors border ${isMuted ? "bg-white/30 border-white/40" : "bg-white/10 border-white/15 hover:bg-white/20"}`}
                    >
                      {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
                    </button>
                    <span className="text-white/55 text-xs">{isMuted ? "Unmute" : "Mute"}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-white/10 border border-white/15 flex items-center justify-center opacity-40 cursor-not-allowed">
                      <Volume2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white/35 text-xs">Speaker</span>
                  </div>
                </div>
              )}

              <div className="flex gap-14 items-end">
                {callState === "incoming" && (
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={acceptCall}
                      className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-105"
                    >
                      <Phone className="w-7 h-7 text-white" />
                    </button>
                    <span className="text-white/60 text-xs">Accept</span>
                  </div>
                )}
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={callState === "incoming" ? rejectCall : () => cleanup()}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all hover:scale-105"
                  >
                    <PhoneOff className="w-7 h-7 text-white" />
                  </button>
                  <span className="text-white/60 text-xs">{callState === "incoming" ? "Decline" : "End Call"}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};
