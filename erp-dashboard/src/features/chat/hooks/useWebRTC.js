import { useRef, useCallback } from "react";
import { callActions, getCallState } from "../store/callStore.js";

const buildIceServers = () => {
  const servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrl = (import.meta.env.VITE_TURN_URL || "").trim();
  const turnUsername = (import.meta.env.VITE_TURN_USERNAME || "").trim();
  const turnCredential = (import.meta.env.VITE_TURN_CREDENTIAL || "").trim();

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
};

const ICE_CONFIG = {
  iceServers: buildIceServers(),
};

/**
 * Manages an RTCPeerConnection for a single call.
 * The peer connection is stored in a ref so it survives re-renders.
 */
export function useWebRTC() {
  const pcRef = useRef(null);

  /** Acquire local media stream and store it in callStore. */
  const getMediaStream = useCallback(async (callType) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });
    callActions.setLocalStream(stream);
    return stream;
  }, []);

  /**
   * Create RTCPeerConnection and wire up ICE + track callbacks.
   * @param {Function} onIceCandidate  called with each ICE candidate
   */
  const createPeerConnection = useCallback((onIceCandidate) => {
    // Clean up any existing connection first
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      callActions.setRemoteStream(remoteStream);
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] connection state:", pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE state:", pc.iceConnectionState);
    };

    return pc;
  }, []);

  /** Add all tracks from a local stream to the peer connection. */
  const addTracks = useCallback((stream) => {
    if (!pcRef.current) return;
    stream.getTracks().forEach((track) => {
      pcRef.current.addTrack(track, stream);
    });
  }, []);

  /** Create and set a local SDP offer; returns the offer. */
  const createOffer = useCallback(async () => {
    if (!pcRef.current) return null;
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    return offer;
  }, []);

  /**
   * Set remote offer description and create an answer;
   * returns the answer.
   */
  const createAnswer = useCallback(async (offer) => {
    if (!pcRef.current) return null;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);
    return answer;
  }, []);

  /** Set remote answer description. */
  const setRemoteAnswer = useCallback(async (answer) => {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  /** Add a received ICE candidate to the peer connection. */
  const addIceCandidate = useCallback(async (candidate) => {
    if (!pcRef.current) return;
    try {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("[WebRTC] addIceCandidate error:", err.message);
    }
  }, []);

  /** Close and discard the peer connection. */
  const closePeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  /** Toggle microphone mute on the local stream. */
  const toggleMute = useCallback(() => {
    const { localStream, isMuted } = getCallState();
    if (!localStream) return;
    const newMuted = !isMuted;
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !newMuted;
    });
    callActions.setIsMuted(newMuted);
  }, []);

  /** Toggle camera on/off on the local stream (video calls only). */
  const toggleCamera = useCallback(() => {
    const { localStream, isCameraOff } = getCallState();
    if (!localStream) return;
    const newOff = !isCameraOff;
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = !newOff;
    });
    callActions.setIsCameraOff(newOff);
  }, []);

  return {
    pcRef,
    getMediaStream,
    createPeerConnection,
    addTracks,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    closePeerConnection,
    toggleMute,
    toggleCamera,
  };
}
