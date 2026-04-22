import React from 'react';

const EVENT_CONFIG = {
  CREATED:              { icon: '📝', color: 'bg-slate-100 dark:bg-slate-700',    dot: 'bg-slate-400',    label: 'Created' },
  STARTED:              { icon: '🚀', color: 'bg-blue-50 dark:bg-blue-900/20',    dot: 'bg-blue-500',     label: 'Started' },
  PAUSED:               { icon: '⏸️', color: 'bg-orange-50 dark:bg-orange-900/20', dot: 'bg-orange-400',  label: 'Paused' },
  RESUMED:              { icon: '▶️', color: 'bg-blue-50 dark:bg-blue-900/20',    dot: 'bg-blue-400',     label: 'Resumed' },
  ON_HOLD:              { icon: '🔒', color: 'bg-slate-100 dark:bg-slate-700/50', dot: 'bg-slate-500',    label: 'On Hold' },
  RESUMED_FROM_HOLD:    { icon: '🔓', color: 'bg-green-50 dark:bg-green-900/20',  dot: 'bg-green-400',    label: 'Resumed from Hold' },
  EXTENSION_REQUESTED:  { icon: '⏳', color: 'bg-cyan-50 dark:bg-cyan-900/20',    dot: 'bg-cyan-400',     label: 'Extension Requested' },
  EXTENSION_APPROVED:   { icon: '✅', color: 'bg-green-50 dark:bg-green-900/20',  dot: 'bg-green-500',    label: 'Extension Approved' },
  EXTENSION_REJECTED:   { icon: '❌', color: 'bg-red-50 dark:bg-red-900/20',      dot: 'bg-red-400',      label: 'Extension Rejected' },
  REASSIGNED:           { icon: '👤', color: 'bg-purple-50 dark:bg-purple-900/20',dot: 'bg-purple-400',   label: 'Reassigned' },
  COMMENT:              { icon: '💬', color: 'bg-indigo-50 dark:bg-indigo-900/20',dot: 'bg-indigo-400',   label: 'Comment' },
  REJECTED:             { icon: '🚫', color: 'bg-red-50 dark:bg-red-900/20',      dot: 'bg-red-500',      label: 'Rejected' },
  COMPLETED:            { icon: '✅', color: 'bg-emerald-50 dark:bg-emerald-900/20', dot: 'bg-emerald-500', label: 'Completed' },
};

const fmtTime = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const fmtSecs = (s) => {
  if (!s) return null;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

function EventDetails({ type, details }) {
  if (!details) return null;

  return (
    <div className="mt-2 space-y-1">
      {/* Created */}
      {type === 'CREATED' && (
        <>
          {details.priority && <Detail label="Priority" value={details.priority} />}
          {details.dueDate && <Detail label="Due" value={fmtTime(details.dueDate)} />}
          {(details.estimatedHours > 0 || details.estimatedMinutes > 0) && (
            <Detail label="Estimate" value={`${details.estimatedHours || 0}h ${details.estimatedMinutes || 0}m`} />
          )}
        </>
      )}

      {/* Paused */}
      {type === 'PAUSED' && details.reason && (
        <>
          <Detail label="Reason" value={details.reason} />
          <p className="text-xs text-orange-600 dark:text-orange-400 italic">{details.note}</p>
        </>
      )}

      {/* Resumed from pause */}
      {type === 'RESUMED' && details.pausedDuration > 0 && (
        <Detail label="Pause duration" value={fmtSecs(details.pausedDuration)} />
      )}

      {/* On Hold */}
      {type === 'ON_HOLD' && (
        <>
          {details.reason && <Detail label="Blocker" value={details.reason} />}
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">{details.note}</p>
        </>
      )}

      {/* Resumed from hold */}
      {type === 'RESUMED_FROM_HOLD' && details.holdDuration > 0 && (
        <Detail label="Hold duration" value={fmtSecs(details.holdDuration)} />
      )}

      {/* Extension */}
      {type === 'EXTENSION_REQUESTED' && (
        <>
          <Detail label="Requested" value={`+${details.requestedMinutes} min`} />
          {details.remarks && <Detail label="Reason" value={details.remarks} />}
          <Detail label="Status" value={details.status} />
        </>
      )}
      {type === 'EXTENSION_APPROVED' && (
        <Detail label="Added" value={`+${details.requestedMinutes} min`} />
      )}
      {type === 'EXTENSION_REJECTED' && details.reason && (
        <Detail label="Reason" value={details.reason} />
      )}

      {/* Reassigned */}
      {type === 'REASSIGNED' && details.reason && (
        <Detail label="Reason" value={details.reason} />
      )}

      {/* Comment */}
      {type === 'COMMENT' && details.text && (
        <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 italic">
          "{details.text}"
        </p>
      )}

      {/* Rejected */}
      {type === 'REJECTED' && details.reason && (
        <Detail label="Reason" value={details.reason} />
      )}

      {/* Completed */}
      {type === 'COMPLETED' && (
        <>
          {details.completionRemarks && (
            <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-emerald-200 dark:border-emerald-700 rounded px-2 py-1.5">
              "{details.completionRemarks}"
            </p>
          )}
          {details.totalActiveSeconds > 0 && <Detail label="Active time" value={fmtSecs(details.totalActiveSeconds)} />}
          {details.totalPausedSeconds > 0 && <Detail label="Paused time" value={fmtSecs(details.totalPausedSeconds)} />}
          {details.totalHoldSeconds > 0 && <Detail label="Hold time" value={fmtSecs(details.totalHoldSeconds)} />}
        </>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <p className="text-xs text-slate-600 dark:text-slate-400">
      <span className="font-semibold text-slate-700 dark:text-slate-300">{label}:</span> {value}
    </p>
  );
}

export default function ActivityTimeline({ activityLog = [], timeline = [] }) {
  // Support both old activityLog format and new timeline format
  const events = timeline.length > 0 ? timeline : activityLog.map(a => {
    // Map activityLog actions to timeline event types
    const typeMap = {
      created: 'CREATED', assigned: 'CREATED', started: 'STARTED',
      paused: 'PAUSED', resumed: 'RESUMED',
      blocked: 'ON_HOLD', unblocked: 'RESUMED_FROM_HOLD',
      completed: 'COMPLETED', reopened: 'CREATED',
      reassigned: 'REASSIGNED', comment_added: 'COMMENT',
      status_changed: 'STARTED',
    };
    return {
      type: typeMap[a.action] || a.action?.toUpperCase().replace(/-/g, '_') || 'STARTED',
      timestamp: a.timestamp,
      description: a.details?.message || a.action,
      actor: a.user ? { name: a.userName } : null,
      details: a.details || {},
    };
  });

  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet</p>
      </div>
    );
  }

  // Sort oldest first (chronological)
  const sorted = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div className="space-y-0">
      {sorted.map((event, index) => {
        const cfg = EVENT_CONFIG[event.type] || { icon: '📌', color: 'bg-slate-50 dark:bg-slate-800', dot: 'bg-slate-400', label: event.type };
        const isLast = index === sorted.length - 1;

        return (
          <div key={event._id || index} className="flex gap-3 relative">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-4 top-9 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
            )}

            {/* Dot */}
            <div className="flex-shrink-0 z-10 mt-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 border-white dark:border-slate-800 ${cfg.color}`}>
                {cfg.icon}
              </div>
            </div>

            {/* Content */}
            <div className={`flex-1 mb-4 rounded-lg px-3 py-2.5 ${cfg.color} border border-slate-100 dark:border-slate-700`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-white leading-snug">
                  {event.description}
                </p>
                <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${cfg.dot} text-white`}>
                  {cfg.label}
                </span>
              </div>

              {event.actor?.name && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  by <span className="font-medium">{event.actor.name}</span>
                </p>
              )}

              <EventDetails type={event.type} details={event.details} />

              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                {fmtTime(event.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
