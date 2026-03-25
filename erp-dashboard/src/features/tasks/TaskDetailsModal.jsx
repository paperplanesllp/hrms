import React, { useState } from 'react';
import { X, MessageSquare, Edit2, Trash2, MoreVertical, CheckCircle2 } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import {
  getPriorityStyles,
  getStatusStyles,
  getPriorityLabel,
  getStatusLabel,
  getDueDateDisplay,
  isTaskOverdue
} from './taskUtils.js';

export default function TaskDetailsModal({
  task,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  isLoading = false
}) {
  const [comments, setComments] = useState(task?.comments || []);
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  if (!task) return null;

  const priorityStyles = getPriorityStyles(task.priority);
  const statusStyles = getStatusStyles(task.status);
  const isOverdue = isTaskOverdue(task.dueDate, task.status);

  const handleAddComment = (e) => {
    e.preventDefault();
    if (commentText.trim()) {
      // This would typically call an API
      setComments([
        ...comments,
        {
          _id: Date.now(),
          userId: { name: 'You', avatar: '' },
          text: commentText,
          createdAt: new Date()
        }
      ]);
      setCommentText('');
    }
  };

  const handleStatusChange = async () => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    if (onStatusChange) {
      await onStatusChange(task._id, nextStatus);
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

          <div className="flex gaps-2">
            {/* Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertical size={18} />
              </Button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      onEdit(task);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-2"
                  >
                    <Edit2 size={14} /> Edit Task
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this task?')) {
                        onDelete(task._id);
                        onClose();
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete Task
                  </button>
                </div>
              )}
            </div>

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
            {/* Assigned To */}
            <div className={`p-3 rounded-lg ${priorityStyles.bg} border ${priorityStyles.border}`}>
              <p className={`text-xs font-semibold ${priorityStyles.text} mb-1`}>Assigned To</p>
              <div className="flex items-center gap-2">
                {task.assignedTo?.avatar ? (
                  <img
                    src={task.assignedTo.avatar}
                    alt={task.assignedTo?.name}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600" />
                )}
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {task.assignedTo?.name || 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Due Date */}
            <div className={`p-3 rounded-lg ${isOverdue ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700' : statusStyles.bg + ' border ' + statusStyles.border}`}>
              <p className={`text-xs font-semibold ${isOverdue ? 'text-red-700 dark:text-red-300' : statusStyles.text} mb-1`}>
                {isOverdue ? 'OVERDUE' : 'Due Date'}
              </p>
              <p className={`text-sm font-medium ${isOverdue ? 'text-red-900 dark:text-red-100' : 'text-slate-900 dark:text-white'}`}>
                {new Date(task.dueDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
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

            {/* Created By */}
            {task.assignedBy && (
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900/30 border border-slate-300 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned by</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {task.assignedBy.name}
                </p>
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

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tags</h3>
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
          <div className="flex gap-2">
            <Button
              onClick={handleStatusChange}
              disabled={isLoading}
              className={task.status === 'completed' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}
            >
              <CheckCircle2 size={16} />
              {task.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
            </Button>
          </div>

          {/* Comments Section */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <MessageSquare size={16} />
              Comments ({task.comments?.length || 0})
            </h3>

            {/* Add Comment */}
            <form onSubmit={handleAddComment} className="mb-4 space-y-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="2"
              />
              <Button
                type="submit"
                disabled={!commentText.trim()}
                size="sm"
                className="w-full"
              >
                Post Comment
              </Button>
            </form>

            {/* Comments List */}
            <div className="space-y-3">
              {task.comments && task.comments.length > 0 ? (
                task.comments.map((comment) => (
                  <div key={comment._id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                      {comment.userId?.avatar ? (
                        <img
                          src={comment.userId.avatar}
                          alt={comment.userId?.name}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600" />
                      )}
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {comment.userId?.name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {comment.text}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  No comments yet
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
