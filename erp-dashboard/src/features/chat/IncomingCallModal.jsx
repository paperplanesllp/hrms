import React from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { getInitials } from "./chatUtils.js";

/**
 * Fullscreen overlay shown when the current user receives an incoming call.
 * Ringtone is managed by CallProvider.
 */
export default function IncomingCallModal({ data, onAccept, onReject }) {

  if (!data) return null;

  const { callerName, callerImage, callType } = data;
  const isVideo = callType === "video";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-80 rounded-3xl overflow-hidden shadow-2xl">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900" />

        <div className="relative flex flex-col items-center gap-5 px-8 py-10">
          {/* Pulsing ring around avatar */}
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <span className="absolute inset-1 rounded-full bg-emerald-500/10 animate-ping [animation-delay:0.3s]" />

            {callerImage ? (
              <img
                src={callerImage}
                alt={callerName}
                className="relative w-24 h-24 rounded-full object-cover ring-4 ring-white/20"
              />
            ) : (
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-white/20">
                {getInitials(callerName || "?")}
              </div>
            )}
          </div>

          {/* Caller info */}
          <div className="text-center">
            <p className="text-white/60 text-sm font-medium">
              {isVideo ? "Incoming video call" : "Incoming voice call"}
            </p>
            <h2 className="text-white text-xl font-semibold mt-1">{callerName || "Unknown"}</h2>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-12 mt-2">
            {/* Reject */}
            <button
              onClick={onReject}
              className="flex flex-col items-center gap-2 group"
              aria-label="Reject call"
            >
              <span className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors group-hover:scale-105 active:scale-95">
                <PhoneOff className="w-7 h-7 text-white" />
              </span>
              <span className="text-white/60 text-xs">Decline</span>
            </button>

            {/* Accept */}
            <button
              onClick={onAccept}
              className="flex flex-col items-center gap-2 group"
              aria-label="Accept call"
            >
              <span className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg transition-colors group-hover:scale-105 active:scale-95">
                {isVideo ? (
                  <Video className="w-7 h-7 text-white" />
                ) : (
                  <Phone className="w-7 h-7 text-white" />
                )}
              </span>
              <span className="text-white/60 text-xs">Accept</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
