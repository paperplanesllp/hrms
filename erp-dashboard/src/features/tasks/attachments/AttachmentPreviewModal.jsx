import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { getAttachmentKind, getDownloadUrl, normalizeAttachment } from './attachmentUtils.js';

export default function AttachmentPreviewModal({ attachment, onClose }) {
  if (!attachment) return null;

  const file = normalizeAttachment(attachment);
  const kind = getAttachmentKind(file);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{file.originalName || 'Attachment'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{kind.toUpperCase()} preview</p>
          </div>
          <div className="flex items-center gap-2">
            <a href={getDownloadUrl(file)} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Download">
              <Download className="h-4 w-4" />
            </a>
            <a href={file.url} target="_blank" rel="noreferrer" className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Open">
              <ExternalLink className="h-4 w-4" />
            </a>
            <button onClick={onClose} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex max-h-[78vh] min-h-[50vh] items-center justify-center bg-slate-50 dark:bg-slate-950">
          {kind === 'image' ? (
            <img src={file.url} alt={file.originalName || 'Attachment'} className="max-h-[78vh] max-w-full object-contain transition-transform duration-300 hover:scale-[1.03]" />
          ) : kind === 'pdf' ? (
            <iframe src={file.url} title={file.originalName || 'PDF preview'} className="h-[78vh] w-full bg-white" />
          ) : (
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Preview is not available for this file type.</p>
              <a href={file.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
