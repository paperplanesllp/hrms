import React from 'react';

export default function UploadProgress({ value = 0, status = 'ready' }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            status === 'error' ? 'bg-red-500' : status === 'done' ? 'bg-emerald-500' : 'bg-blue-500'
          }`}
          style={{ width: `${status === 'ready' ? 0 : percent}%` }}
        />
      </div>
      {status !== 'ready' && (
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {status === 'done' ? 'Uploaded' : status === 'error' ? 'Failed' : `${percent}% uploading`}
        </p>
      )}
    </div>
  );
}
