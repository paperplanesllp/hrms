import React, { useState } from 'react';
import { X, CheckCircle2, FileText, Download, Image, File, Paperclip, Eye } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import {
  getPriorityStyles,
  getStatusStyles,
  getPriorityLabel,
  getStatusLabel,
  isTaskOverdue,
  getDaysUntilDue
} from './taskUtils.js';

export default function TaskDetailsModal({
  task,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  isLoading = false
}) {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!task) return null;

  const priorityStyles = getPriorityStyles(task.priority);
  const statusStyles = getStatusStyles(task.status);
  const isOverdue = isTaskOverdue(task.dueDate, task.status);

  const handleStatusChange = async () => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    if (onStatusChange) {
      await onStatusChange(task._id, nextStatus);
    }
  };

  const handleHoldTask = async () => {
    if (onStatusChange) {
      await onStatusChange(task._id, 'on-hold');
    }
  };

  // Helper function to get file type
  const getFileType = (fileName) => {
    if (!fileName) return 'unknown';
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'document';
    if (['xls', 'xlsx'].includes(ext)) return 'spreadsheet';
    return 'file';
  };

  // Helper function to get file icon
  const getFileIcon = (fileName) => {
    const type = getFileType(fileName);
    switch (type) {
      case 'image':
        return <Image size={16} className="text-blue-500" />;
      case 'pdf':
        return <FileText size={16} className="text-red-500" />;
      case 'document':
        return <File size={16} className="text-blue-500" />;
      case 'spreadsheet':
        return <File size={16} className="text-green-500" />;
      default:
        return <Paperclip size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-4 h-4 rounded-full ${priorityStyles.dot}`}></div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {task.title}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${priorityStyles.badge}`}>
                <span className={`w-2 h-2 rounded-full ${priorityStyles.dot}`}></span>
                {getPriorityLabel(task.priority)}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyles.badge}`}>
                <span className={`w-2 h-2 rounded-full ${statusStyles.dot}`}></span>
                {getStatusLabel(task.status)}
              </span>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  ⚠ Overdue
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Description
              </h3>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Meta Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Due Date */}
            <div className={`p-3 rounded-lg ${isOverdue ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700' : statusStyles.bg + ' border ' + statusStyles.border}`}>
              <p className={`text-xs font-semibold ${isOverdue ? 'text-red-700 dark:text-red-300' : statusStyles.text} mb-1`}>
                {isOverdue ? 'OVERDUE' : 'Due Date & Time'}
              </p>
              <p className={`text-sm font-medium ${isOverdue ? 'text-red-900 dark:text-red-100' : 'text-slate-900 dark:text-white'}`}>
                {(() => {
                  const date = new Date(task.dueDate);
                  const dateStr = date.toLocaleString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'Asia/Kolkata'
                  });
                  const timeStr = date.toLocaleString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'Asia/Kolkata'
                  });
                  return `${dateStr}, ${timeStr}`;
                })()}
              </p>
              {isOverdue && (
                <p className="text-xs font-semibold text-red-600 dark:text-red-300 mt-1">
                  Overdue for {Math.abs(getDaysUntilDue(task.dueDate))} days
                </p>
              )}
            </div>

            {/* Progress */}
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900/30 border border-slate-300 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Progress</p>
              <div className="space-y-1">
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      task.progress === 100 ? 'bg-green-500' : 
                      task.progress >= 75 ? 'bg-blue-500' :
                      task.progress >= 50 ? 'bg-amber-500' :
                      task.progress >= 25 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${task.progress || 0}%` }}
                  ></div>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white text-right">
                  {task.progress || 0}%
                </p>
              </div>
            </div>

            {/* Department */}
            {task.department && (
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900/30 border border-slate-300 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {task.department.name}
                </p>
              </div>
            )}

            {/* Assigned By */}
            {task.assignedBy && (
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900/30 border border-slate-300 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned By</p>
                <div className="flex items-center gap-2">
                  {task.assignedBy?.avatar ? (
                    <img
                      src={task.assignedBy.avatar}
                      alt={task.assignedBy?.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600" />
                  )}
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {task.assignedBy?.name || 'Unknown'}
                  </span>
                </div>
              </div>
            )}

            {/* Created At */}
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900/30 border border-slate-300 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Created</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {new Date(task.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Remarks */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Remarks</h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status Action */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleStatusChange}
              disabled={isLoading}
              className={task.status === 'completed' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}
            >
              <CheckCircle2 size={16} />
              {task.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleHoldTask}
              disabled={isLoading}
            >
              Hold
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => console.log('Forward task')}
            >
              Forward
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {}}
            >
              Reassign
            </Button>
          </div>

          {/* Attachments Section */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <Paperclip size={16} />
                Attachments ({task.attachments.length})
              </h3>
              
              {/* Images Gallery */}
              {task.attachments.filter(a => getFileType(a) === 'image').length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wide">
                    Images
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {task.attachments
                      .filter(a => getFileType(a) === 'image')
                      .map((attachment, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-all"
                        >
                          <img
                            src={attachment}
                            alt={`Attachment ${idx + 1}`}
                            className="w-full h-24 object-cover hover:opacity-75 transition-opacity cursor-pointer"
                            onClick={() => setSelectedImage(attachment)}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => setSelectedImage(attachment)}
                              className="p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                              title="Preview"
                            >
                              <Eye size={14} className="text-slate-900" />
                            </button>
                            <a
                              href={attachment}
                              download
                              className="p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                              title="Download"
                            >
                              <Download size={14} className="text-slate-900" />
                            </a>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Documents & Files */}
              {task.attachments.filter(a => getFileType(a) !== 'image').length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wide">
                    Documents & Files
                  </h4>
                  <div className="space-y-2">
                    {task.attachments
                      .filter(a => getFileType(a) !== 'image')
                      .map((attachment, idx) => {
                        const fileName = attachment.split('/').pop();
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                          >
                            {getFileIcon(fileName)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {fileName}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {getFileType(fileName).charAt(0).toUpperCase() + getFileType(fileName).slice(1)}
                              </p>
                            </div>
                            <a
                              href={attachment}
                              download
                              className="flex-shrink-0 p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download size={16} className="text-blue-600 dark:text-blue-400" />
                            </a>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Image Preview Modal */}
          {selectedImage && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80"
              onClick={() => setSelectedImage(null)}
            >
              <div
                className="relative max-w-2xl max-h-[80vh] bg-white dark:bg-slate-900 rounded-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 z-10 p-2 bg-white/90 dark:bg-slate-800/90 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                  <X size={20} className="text-slate-900 dark:text-white" />
                </button>
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}


        </div>
      </Card>
    </div>
  );
}
