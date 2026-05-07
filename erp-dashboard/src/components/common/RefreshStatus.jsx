import React from "react";
import { RefreshCw } from "lucide-react";

function getLastUpdatedLabel(lastUpdatedAt) {
  if (!lastUpdatedAt) return "Waiting for refresh";

  const seconds = Math.max(0, Math.floor((Date.now() - new Date(lastUpdatedAt).getTime()) / 1000));
  if (seconds < 5) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  return `Updated ${minutes}m ago`;
}

export default function RefreshStatus({ isRefreshing = false, lastUpdatedAt = null, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm ${className}`}
    >
      <RefreshCw className={`h-3.5 w-3.5 text-blue-500 ${isRefreshing ? "animate-spin" : ""}`} />
      {isRefreshing ? "Refreshing..." : getLastUpdatedLabel(lastUpdatedAt)}
    </span>
  );
}
