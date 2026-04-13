import React from "react";
import { Phone, PhoneMissed, Video, PhoneOff } from "lucide-react";
import { formatISTTime } from "../../lib/istDateTime.js";
import {
  formatCallDuration,
  getCallTitle,
  normalizeCallStatus,
  normalizeCallType,
  resolveCallDurationSeconds,
} from "./callUtils.js";

/**
 * Renders a call log entry in the chat timeline.
 * Shows missed calls, completed calls, rejected calls, etc.
 */
export default function CallLogMessage({ callLog, currentUserId }) {
  if (!callLog) return null;

  const callType = normalizeCallType(callLog);
  const callStatus = normalizeCallStatus(callLog);
  const durationSeconds = resolveCallDurationSeconds(callLog);
  const title = getCallTitle(callLog);

  let icon = callType === "video"
    ? <Video className="w-4 h-4 text-emerald-500" />
    : <Phone className="w-4 h-4 text-emerald-500" />;
  let textColor = "text-slate-600 dark:text-slate-400";

  if (callStatus === "missed" || callStatus === "unanswered") {
    icon = <PhoneMissed className="w-4 h-4 text-red-500" />;
    textColor = "text-red-600 dark:text-red-400";
  } else if (callStatus === "declined" || callStatus === "cancelled") {
    icon = <PhoneOff className="w-4 h-4 text-amber-500" />;
    textColor = "text-amber-600 dark:text-amber-400";
  } else if (callStatus === "completed") {
    textColor = "text-emerald-600 dark:text-emerald-400";
  }

  const timeStr = formatISTTime(callLog.createdAt || callLog.startedAt || callLog.timestamp);
  const shouldShowDuration = callStatus === "completed" && durationSeconds > 0;

  return (
    <div className="flex justify-center py-3 my-2">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${textColor} bg-slate-100 dark:bg-slate-800`}>
        {icon}
        <span>{title}</span>
        {shouldShowDuration && (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {formatCallDuration(durationSeconds)}
          </span>
        )}
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {timeStr}
        </span>
      </div>
    </div>
  );
}
