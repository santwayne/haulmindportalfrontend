import React, { createContext, useContext, useState, useRef, useCallback } from "react";

type CallState = "idle" | "calling" | "incoming" | "connected" | "declined";

interface CallActions {
  startCall: (targetId: string, targetName: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  endCall: (notifyPeer?: boolean) => void;
  rejectCall: () => void;
  toggleMute: () => void;
}

export interface CallContextValue {
  callState: CallState;
  incomingCall: { from: string; offer: any } | null;
  isMuted: boolean;
  isMinimized: boolean;
  callSeconds: number;
  callerName: string;
  isOnChatPage: boolean;
  setCallState: React.Dispatch<React.SetStateAction<CallState>>;
  setIncomingCall: React.Dispatch<React.SetStateAction<{ from: string; offer: any } | null>>;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMinimized: React.Dispatch<React.SetStateAction<boolean>>;
  setCallSeconds: React.Dispatch<React.SetStateAction<number>>;
  setCallerName: React.Dispatch<React.SetStateAction<string>>;
  setIsOnChatPage: React.Dispatch<React.SetStateAction<boolean>>;
  startCall: (targetId: string, targetName: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  endCall: (notifyPeer?: boolean) => void;
  rejectCall: () => void;
  toggleMute: () => void;
  registerActions: (actions: CallActions) => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [callState, setCallState] = useState<CallState>("idle");
  const [incomingCall, setIncomingCall] = useState<{ from: string; offer: any } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [callerName, setCallerName] = useState("");
  const [isOnChatPage, setIsOnChatPage] = useState(false);

  const actionsRef = useRef<CallActions>({
    startCall: async () => {},
    acceptCall: async () => {},
    endCall: () => {},
    rejectCall: () => {},
    toggleMute: () => {},
  });

  const registerActions = useCallback((actions: CallActions) => {
    actionsRef.current = actions;
  }, []);

  return (
    <CallContext.Provider value={{
      callState, setCallState,
      incomingCall, setIncomingCall,
      isMuted, setIsMuted,
      isMinimized, setIsMinimized,
      callSeconds, setCallSeconds,
      callerName, setCallerName,
      isOnChatPage, setIsOnChatPage,
      startCall: (id, name) => actionsRef.current.startCall(id, name),
      acceptCall: () => actionsRef.current.acceptCall(),
      endCall: (notifyPeer) => actionsRef.current.endCall(notifyPeer),
      rejectCall: () => actionsRef.current.rejectCall(),
      toggleMute: () => actionsRef.current.toggleMute(),
      registerActions,
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
};
