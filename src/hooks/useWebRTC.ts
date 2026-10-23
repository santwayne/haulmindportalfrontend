import { useRef } from "react";
import { socketService } from "../services/socketService";

export const useWebRTC = (userId: string) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.play();
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.getSocket()?.emit("call-ice", {
          to: userId,
          candidate: event.candidate
        });
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const startCall = async () => {
    const pc = createPeerConnection();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketService.getSocket()?.emit("call-user", {
      to: userId,
      offer
    });
  };

  const handleIncomingCall = async (offer: RTCSessionDescriptionInit, from: string) => {
    const pc = createPeerConnection();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    await pc.setRemoteDescription(offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketService.getSocket()?.emit("answer-call", {
      to: from,
      answer
    });
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    await pcRef.current?.setRemoteDescription(answer);
  };

  const handleICE = async (candidate: RTCIceCandidateInit) => {
    await pcRef.current?.addIceCandidate(candidate);
  };

  const endCall = () => {
    pcRef.current?.close();
    pcRef.current = null;

    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
  };

  return {
    startCall,
    handleIncomingCall,
    handleAnswer,
    handleICE,
    endCall
  };
};