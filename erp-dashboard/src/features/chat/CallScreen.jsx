import React, { useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
} from "lucide-react";
import { useCallStore } from "./store/callStore.js";
import { getInitials } from "./chatUtils.js";

/**
 * Full-screen overlay for an active voice or video call.
 * Receives remoteUser, callType, callStatus, and onEnd from CallProvider.
 */
export default function CallScreen({ remoteUser, callType, callStatus, onEnd }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const localStream = useCallStore((s) => s.localStream);
  const remoteStream = useCallStore((s) => s.remoteStream);
  const isMuted = useCallStore((s) => s.isMuted);
  const isCameraOff = useCallStore((s) => s.isCameraOff);
  const callDuration = useCallStore((s) => s.callDuration);

  const isVideo = callType === "video";
  const isConnected = callStatus === "connected" || callStatus === "in_call";

  // ── Attach streams to <video> elements ────────────────────────────────────
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // ── Format elapsed time ────────────────────────────────────────────────────
  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const statusLabel =
    callStatus === "trying"
      ? "Trying to reach user..."
      : callStatus === "calling"
      ? "Calling..."
      : callStatus === "ringing" || callStatus === "incoming"
      ? "Ringing..."
      : callStatus === "connecting"
      ? "Connecting..."
      : callStatus === "reconnecting"
      ? "Reconnecting..."
      : callStatus === "rejected"
      ? "Rejected"
      : callStatus === "no_answer"
      ? "No answer"
      : callStatus === "failed"
      ? "Couldn't reach user"
      : isConnected
      ? formatDuration(callDuration)
      : callStatus;

  const name = remoteUser?.name || "Unknown";

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col bg-slate-900 text-white select-none">
      <audio ref={remoteAudioRef} autoPlay playsInline />
      {/* ── VIDEO CALL LAYOUT ─────────────────────────────────────────────── */}
      {isVideo ? (
        <>
          {/* Remote video — full screen */}
          <div className="absolute inset-0 bg-black">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <AvatarPlaceholder name={name} image={remoteUser?.profileImageUrl} size="lg" />
              </div>
            )}
          </div>

          {/* Local video — picture-in-picture */}
          <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-10 bg-slate-800">
            {localStream && !isCameraOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-700">
                <VideoOff className="w-6 h-6 text-white/40" />
              </div>
            )}
          </div>

          {/* Overlay — name + status */}
          <div className="relative z-10 flex flex-col items-start gap-1 p-6 mt-safe bg-gradient-to-b from-black/60 to-transparent pb-16">
            <h2 className="text-xl font-semibold">{name}</h2>
            <p className="text-sm text-white/70">{statusLabel}</p>
          </div>
        </>
      ) : (
        /* ── VOICE CALL LAYOUT ──────────────────────────────────────────── */
        <div className="flex-1 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-slate-800 to-slate-900">
          <AvatarPlaceholder name={name} image={remoteUser?.profileImageUrl} size="lg" />
          <div className="text-center">
            <h2 className="text-2xl font-semibold">{name}</h2>
            <p className="text-white/60 mt-1 text-sm flex items-center justify-center gap-2">
              {isConnected && <Volume2 className="w-4 h-4 text-emerald-400" />}
              {statusLabel}
            </p>
          </div>
        </div>
      )}

      {/* ── CONTROL BAR ───────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-center gap-5 p-6 pb-safe bg-gradient-to-t from-black/70 to-transparent">
        {/* Mute */}
        <ControlButton
          onClick={() => {/* toggleMute called via CallProvider */
            window.dispatchEvent(new CustomEvent("call:toggle-mute"));
          }}
          active={isMuted}
          activeClass="bg-white text-slate-900"
          defaultClass="bg-white/20 text-white"
          label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </ControlButton>

        {/* Camera — only for video calls */}
        {isVideo && (
          <ControlButton
            onClick={() => {
              window.dispatchEvent(new CustomEvent("call:toggle-camera"));
            }}
            active={isCameraOff}
            activeClass="bg-white text-slate-900"
            defaultClass="bg-white/20 text-white"
            label={isCameraOff ? "Camera on" : "Camera off"}
          >
            {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </ControlButton>
        )}

        {/* End call */}
        <button
          onClick={onEnd}
          aria-label="End call"
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl transition-colors active:scale-95"
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function AvatarPlaceholder({ name, image, size = "md" }) {
  const dim = size === "lg" ? "w-32 h-32 text-4xl" : "w-20 h-20 text-2xl";
  return image ? (
    <img
      src={image}
      alt={name}
      className={`${dim} rounded-full object-cover ring-4 ring-white/20`}
    />
  ) : (
    <div
      className={`${dim} rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-bold text-white ring-4 ring-white/20`}
    >
      {getInitials(name || "?")}
    </div>
  );
}

function ControlButton({ children, onClick, active, activeClass, defaultClass, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
        active ? activeClass : defaultClass
      }`}
    >
      {children}
    </button>
  );
}
