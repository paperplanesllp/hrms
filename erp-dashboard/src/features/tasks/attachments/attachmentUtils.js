export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_COUNT = 12;

export const ACCEPTED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed'
];

export const ACCEPTED_ATTACHMENT_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip';

export function normalizeAttachment(attachment) {
  if (typeof attachment === 'string') {
    const originalName = attachment.split('/').pop() || 'Attachment';
    return {
      _id: attachment,
      url: attachment,
      originalName,
      mimeType: '',
      bytes: 0,
      uploadedAt: null,
      uploadedBy: null,
      public_id: null,
    };
  }

  return attachment || {};
}

export function formatBytes(bytes = 0) {
  if (!bytes) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getAttachmentKind(file = {}) {
  const name = (file.originalName || file.name || file.url || '').toLowerCase();
  const mimeType = (file.mimeType || file.type || '').toLowerCase();

  if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/.test(name)) return 'image';
  if (mimeType.startsWith('video/') || /\.(mp4|mov|webm)$/.test(name)) return 'video';
  if (mimeType.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mimeType.includes('word') || /\.(doc|docx)$/.test(name)) return 'doc';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || /\.(xls|xlsx)$/.test(name)) return 'xls';
  if (mimeType.includes('zip') || name.endsWith('.zip')) return 'zip';
  if (mimeType.includes('text') || name.endsWith('.txt')) return 'txt';
  return 'file';
}

export function getFileTypeLabel(file = {}) {
  const kind = getAttachmentKind(file);
  if (kind === 'image') return 'IMAGE';
  if (kind === 'pdf') return 'PDF';
  if (kind === 'doc') return 'DOC';
  if (kind === 'xls') return 'XLS';
  if (kind === 'zip') return 'ZIP';
  if (kind === 'txt') return 'TXT';
  if (kind === 'video') return 'VIDEO';
  return 'FILE';
}

export function getDownloadUrl(file = {}) {
  if (!file?.url) return '';
  return file.downloadUrl || file.url.replace('/upload/', '/upload/fl_attachment/');
}

export function getThumbnailUrl(file = {}, options = 'c_fill,w_360,h_240,q_auto,f_auto') {
  if (!file?.url || getAttachmentKind(file) !== 'image') return file?.url || '';
  if (!file.url.includes('/upload/')) return file.url;
  return file.url.replace('/upload/', `/upload/${options}/`);
}

export function createLocalPreview(file) {
  if (!file || !file.type?.startsWith('image/')) return null;
  return URL.createObjectURL(file);
}
