import React, { useMemo, useState } from 'react';
import { Paperclip } from 'lucide-react';
import api from '../../../lib/api.js';
import AttachmentCard from './AttachmentCard.jsx';
import AttachmentPreviewModal from './AttachmentPreviewModal.jsx';
import { getAttachmentKind, normalizeAttachment } from './attachmentUtils.js';

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'document', label: 'Documents' },
  { id: 'video', label: 'Videos' },
];

export default function AttachmentGallery({ taskId, attachments = [], canDelete = false, onDeleted, toast }) {
  const [activeTab, setActiveTab] = useState('all');
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const normalized = useMemo(() => attachments.map(normalizeAttachment), [attachments]);
  const filtered = normalized.filter(file => {
    if (activeTab === 'all') return true;
    const kind = getAttachmentKind(file);
    if (activeTab === 'document') return !['image', 'video'].includes(kind);
    return kind === activeTab;
  });

  const handleCopy = async (file) => {
    try {
      await navigator.clipboard.writeText(file.url);
      toast?.({ title: 'Link copied', type: 'success' });
    } catch {
      toast?.({ title: 'Could not copy link', type: 'error' });
    }
  };

  const handleDelete = async (file) => {
    if (!taskId || !file?._id || !file.public_id) return;
    try {
      setDeletingId(file._id);
      const response = await api.delete(`/tasks/${taskId}/attachments/${file._id}`);
      toast?.({ title: 'Attachment deleted', type: 'success' });
      onDeleted?.(response.data?.data || response.data);
    } catch (error) {
      toast?.({ title: 'Failed to delete attachment', description: error.response?.data?.message || error.message, type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  if (normalized.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
        <Paperclip className="mx-auto h-7 w-7 text-slate-400" />
        <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">No attachments yet</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Files added to this task will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <Paperclip className="h-4 w-4" />
          Media Gallery ({normalized.length})
        </h3>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((file, index) => (
          <AttachmentCard
            key={file._id || file.url || index}
            attachment={file}
            onPreview={setPreviewAttachment}
            onCopy={handleCopy}
            onDelete={canDelete && file.public_id ? handleDelete : undefined}
            uploadStatus={deletingId === file._id ? 'uploading' : 'ready'}
          />
        ))}
      </div>

      {previewAttachment && (
        <AttachmentPreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
      )}
    </div>
  );
}
