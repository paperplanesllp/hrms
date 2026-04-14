import React from "react";
import { formatIST12Hour } from "../../lib/formatIST12Hour.js";

/**
 * Reusable overdue notification card for chat threads and notification panels.
 */
export default function TaskOverdueNotification({
  taskName,
  timestamp,
  align = "left",
  className = "",
}) {
  const safeTaskName = (taskName || "Untitled Task").trim();
  const timeText = formatIST12Hour(timestamp);
  const parsedTime = timestamp ? new Date(timestamp) : null;
  const dateTimeValue = parsedTime && !Number.isNaN(parsedTime.getTime()) ? parsedTime.toISOString() : "";

  const isRight = align === "right";

  return (
    <div className={`w-full flex ${isRight ? "justify-end" : "justify-start"} ${className}`}>
      <article
        className={[
          "max-w-[min(88vw,420px)] rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50",
          "px-4 py-3.5 shadow-[0_8px_24px_rgba(245,158,11,0.10)] backdrop-blur-sm",
          "dark:border-orange-900/50 dark:from-orange-950/40 dark:via-rose-950/30 dark:to-amber-950/40",
        ].join(" ")}
      >
        <h4 className="text-[15px] font-bold leading-tight text-orange-900 dark:text-orange-200">
          ⚠️ Task Overdue
        </h4>

        <p className="mt-2 text-[14px] leading-relaxed text-slate-700 dark:text-slate-200">
          <span className="font-semibold text-slate-900 dark:text-slate-100">&quot;{safeTaskName}&quot;</span> is now overdue.
        </p>

        <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          Please prioritize and complete it as soon as possible.
        </p>

        <div className="mt-3 flex justify-end">
          <time
            dateTime={dateTimeValue}
            className="text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400"
          >
            {timeText}
          </time>
        </div>
      </article>
    </div>
  );
}
