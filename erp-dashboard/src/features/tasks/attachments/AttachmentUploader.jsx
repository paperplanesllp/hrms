import React, { useMemo, useState } from 'react';
import { Cloud, ShieldCheck } from 'lucide-react';
import AttachmentCard from './AttachmentCard.jsx';
import {
  ACCEPTED_ATTACHMENT_EXTENSIONS,
  ACCEPTED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENT_SIZE,
  createLocalPreview,
  formatBytes,
} from './attachmentUtils.js';

export default function AttachmentUploader({
  files = [],
  onFilesChange,
  uploadProgress = 0,
  isUploading = false,
  isPrivate = false,
  onPrivateChange,
  toast,
}) {
  const [dragActive, setDragActive] = useState(false);

  const filesWithPreview = useMemo(() => files.map(item => item.previewUrl ? item : {
    file: item.file || item,
    previewUrl: createLocalPreview(item.file || item),
  }), [files]);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    const nextFiles = [...filesWithPreview];

    for (const file of incoming) {
      if (nextFiles.length >= MAX_ATTACHMENT_COUNT) {
        toast?.({ title: 'Attachment limit reached', description: `Maximum ${MAX_ATTACHMENT_COUNT} files per task.`, type: 'error' });
        break;
      }

      if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
        toast?.({ title: 'Unsupported file', description: `${file.name} is not an allowed file type.`, type: 'error' });
        continue;
      }

      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast?.({ title: 'File too large', description: `${file.name} is larger than ${formatBytes(MAX_ATTACHMENT_SIZE)}.`, type: 'error' });
        continue;
      }

      nextFiles.push({ file, previewUrl: createLocalPreview(file) });
    }

    onFilesChange?.(nextFiles);
  };

  const removeFile = (target) => {
    const targetFile = target.file || target;
    onFilesChange?.(filesWithPreview.filter(item => (item.file || item) !== targetFile));
  };

  const handleDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(event.type === 'dragenter' || event.type === 'dragover');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed p-7 text-center transition ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
            : 'border-slate-300 bg-slate-50 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900'
        }`}
      >
        <input
          id="task-attachment-upload"
          type="file"
          multiple
          accept={ACCEPTED_ATTACHMENT_EXTENSIONS}
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />
        <label htmlFor="task-attachment-upload" className="flex cursor-pointer flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Cloud className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-900 dark:text-white">Drop files here or click to upload</span>
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Images, PDF, Word, Excel, TXT and ZIP. Max 5 MB each.</span>
          </span>
        </label>
        {isUploading && <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-lg bg-slate-200"><div className="h-full bg-blue-600 transition-all" style={{ width: `${uploadProgress}%` }} /></div>}
      </div>

      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(event) => onPrivateChange?.(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <ShieldCheck className="h-4 w-4 text-slate-500" />
        Private attachments
      </label>

      {filesWithPreview.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filesWithPreview.map((item, index) => {
            const file = item.file || item;
            return (
              <AttachmentCard
                key={`${file.name}-${file.size}-${index}`}
                attachment={{ name: file.name, originalName: file.name, size: file.size, mimeType: file.type, type: file.type }}
                previewUrl={item.previewUrl}
                uploadStatus={isUploading ? 'uploading' : 'ready'}
                uploadProgress={uploadProgress}
                onRemove={() => removeFile(item)}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
