import React from 'react';
import { Copy, Download, ExternalLink, File, FileArchive, FileSpreadsheet, FileText, Image, Trash2 } from 'lucide-react';
import FileTypeBadge from './FileTypeBadge.jsx';
import UploadProgress from './UploadProgress.jsx';
import { formatBytes, getAttachmentKind, getDownloadUrl, getThumbnailUrl, normalizeAttachment } from './attachmentUtils.js';

function IconForFile({ file }) {
  const kind = getAttachmentKind(file);
  const className = "h-5 w-5";
  if (kind === 'image') return <Image className={className} />;
  if (kind === 'pdf' || kind === 'doc' || kind === 'txt') return <FileText className={className} />;
  if (kind === 'xls') return <FileSpreadsheet className={className} />;
  if (kind === 'zip') return <FileArchive className={className} />;
  return <File className={className} />;
}

export default function AttachmentCard({
  attachment,
  previewUrl,
  uploadStatus = 'ready',
  uploadProgress = 0,
  onPreview,
  onRemove,
  onDelete,
  onCopy,
  compact = false,
}) {
  const file = normalizeAttachment(attachment);
  const kind = getAttachmentKind(file);
  const imageUrl = previewUrl || (kind === 'image' ? getThumbnailUrl(file) : null);
  const canOpen = Boolean(file.url);

  return (
    <div className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      {imageUrl ? (
        <button type="button" onClick={() => onPreview?.(file)} className="block h-32 w-full overflow-hidden bg-slate-100 text-left dark:bg-slate-800">
          <img src={imageUrl} alt={file.originalName || file.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        </button>
      ) : (
        <button type="button" onClick={() => onPreview?.(file)} className="flex h-32 w-full items-center justify-center bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          <IconForFile file={file} />
        </button>
      )}

      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{file.originalName || file.name || 'Attachment'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.bytes || file.size)}</p>
          </div>
          <FileTypeBadge file={file} />
        </div>

        {!compact && uploadStatus !== 'ready' && <UploadProgress value={uploadProgress} status={uploadStatus} />}

        <div className="flex items-center justify-end gap-1">
          {canOpen && (
            <>
              <button type="button" onClick={() => onPreview?.(file)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800" title="Preview">
                <ExternalLink className="h-4 w-4" />
              </button>
              <a
                href={getDownloadUrl(file)}
                target="_blank"
                rel="noopener noreferrer"
                download={file.originalName || file.name || true}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
              <button type="button" onClick={() => onCopy?.(file)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800" title="Copy link">
                <Copy className="h-4 w-4" />
              </button>
            </>
          )}
          {(onRemove || onDelete) && (
            <button type="button" onClick={() => (onRemove || onDelete)?.(file)} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" title="Remove">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
