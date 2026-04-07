import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle2, FileText, Download, Image, File, Paperclip, Eye, Clock, History } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { taskService } from './taskService.js';
import { toast } from '../../store/toastStore.js';
import api from '../../lib/api.js';
import { getAuth } from '../../lib/auth.js';
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
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Fetch users when reassign modal opens
  useEffect(() => {
    if (showReassignModal && users.length === 0) {
      fetchUsers();
    }
  }, [showReassignModal]);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const auth = getAuth();
      const currentUserDepartmentId = auth?.user?.departmentId;
      
      // Fetch only department members
      const res = await api.get('/users', {
        params: currentUserDepartmentId ? { department: currentUserDepartmentId } : {}
      });
      
      let fetchedUsers = res.data.data || res.data || [];
      
      // If backend doesn't support department filtering, filter on frontend
      if (currentUserDepartmentId && Array.isArray(fetchedUsers)) {
        fetchedUsers = fetchedUsers.filter(user => user.departmentId === currentUserDepartmentId);
      }
      
      setUsers(fetchedUsers);
      
      if (fetchedUsers.length === 0) {
        console.warn('⚠️ No department members found for reassignment');
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({ title: 'Failed to load team members', type: 'error' });
    } finally {
      setUsersLoading(false);
    }
  };

  if (!task) return null;

  const priorityStyles = getPriorityStyles(task.priority);
  const statusStyles = getStatusStyles(task.status);
  const isOverdue = isTaskOverdue(task.dueDate, task.status);

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

  const handleStatusChange = async () => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    if (onStatusChange) {
      await onStatusChange(task._id, nextStatus);
    }
  };

  const handleHoldTask = async () => {
    if (!holdReason.trim()) {
      toast({ title: 'Hold reason is required', type: 'error' });
      return;
    }

    setIsProcessing(true);
    try {
      await taskService.holdTask(task._id, holdReason);
      toast({ title: 'Task placed on hold', type: 'success' });
      setShowHoldModal(false);
      setHoldReason('');
      if (onStatusChange) {
        await onStatusChange(task._id, 'on-hold');
      }
    } catch (error) {
      toast({ title: error.message || 'Failed to hold task', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResumeFromHold = async () => {
    setIsProcessing(true);
    try {
      await taskService.resumeTaskFromHold(task._id);
      toast({ title: 'Task resumed successfully', type: 'success' });
      if (onStatusChange) {
        await onStatusChange(task._id, 'in-progress');
      }
    } catch (error) {
      toast({ title: error.message || 'Failed to resume task', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReassignTask = async () => {
    if (!selectedAssignee) {
      toast({ title: 'Please select an assignee', type: 'error' });
      return;
    }

    setIsProcessing(true);
    try {
      await taskService.reassignTask(task._id, selectedAssignee, reassignReason);
      toast({ title: 'Task reassigned successfully', type: 'success' });
      setShowReassignModal(false);
      setSelectedAssignee(null);
      setReassignReason('');
      if (onStatusChange) {
        await onStatusChange(task._id, task.status);
      }
    } catch (error) {
      toast({ title: error.message || 'Failed to reassign task', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewTimeline = async () => {
    setIsProcessing(true);
    try {
      const data = await taskService.getTaskTimeline(task._id);
      setTimeline(data);
      setShowTimeline(true);
    } catch (error) {
      toast({ title: error.message || 'Failed to load timeline', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Render workflow buttons based on status
  const renderWorkflowButtons = () => {
    const buttons = [];

    // All statuses can mark complete (except completed)
    if (task.status !== 'completed') {
      buttons.push(
        <Button
          key="complete"
          onClick={handleStatusChange}
          disabled={isLoading || isProcessing}
          className="bg-green-500 hover:bg-green-600"
        >
          <CheckCircle2 size={16} />
          Mark Complete
        </Button>
      );
    }

    // IN_PROGRESS can be held
    if (task.status === 'in-progress') {
      buttons.push(
        <Button
          key="hold"
          variant="outline"
          size="sm"
          onClick={() => setShowHoldModal(true)}
          disabled={isLoading || isProcessing}
        >
          <Clock size={16} />
          Hold
        </Button>
      );
    }

    // ON_HOLD can be resumed
    if (task.status === 'on-hold') {
      buttons.push(
        <Button
          key="resume"
          variant="outline"
          size="sm"
          onClick={handleResumeFromHold}
          disabled={isLoading || isProcessing}
          className="border-blue-500 text-blue-600 hover:bg-blue-50"
        >
          <CheckCircle2 size={16} />
          Resume
        </Button>
      );
    }

    // IN_PROGRESS and ON_HOLD can be reassigned
    if (['in-progress', 'on-hold'].includes(task.status)) {
      buttons.push(
        <Button
          key="reassign"
          variant="outline"
          size="sm"
          onClick={() => setShowReassignModal(true)}
          disabled={isLoading || isProcessing}
        >
          Reassign
        </Button>
      );
    }

    // All can view timeline
    buttons.push(
      <Button
        key="timeline"
        variant="outline"
        size="sm"
        onClick={handleViewTimeline}
        disabled={isLoading || isProcessing}
      >
        <History size={16} />
        Timeline
      </Button>
    );

    return buttons;
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
              {task.holdReason && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                  On Hold
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
          {/* Hold Reason Display */}
          {task.holdReason && (
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-1">Hold Reason</p>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">{task.holdReason}</p>
            </div>
          )}

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

          {/* Workflow Actions */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wide">Workflow Actions</p>
            <div className="flex gap-2 flex-wrap">
              {renderWorkflowButtons()}
            </div>
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

          {/* Hold Modal */}
          {showHoldModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
              <Card className="w-full max-w-md">
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hold Task</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Why are you putting this task on hold?</p>
                  <textarea
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    placeholder="Enter hold reason..."
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowHoldModal(false);
                        setHoldReason('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleHoldTask}
                      disabled={isProcessing || !holdReason.trim()}
                      className="bg-yellow-500 hover:bg-yellow-600"
                    >
                      {isProcessing ? 'Placing on hold...' : 'Hold Task'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Reassign Modal */}
          {showReassignModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
              <Card className="w-full max-w-md">
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reassign Task</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Select new assignee and provide reason</p>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Assignee (Department Members)</label>
                    <select
                      value={selectedAssignee || ''}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      disabled={usersLoading}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">
                        {usersLoading ? 'Loading department members...' : users.length === 0 ? 'No department members found' : 'Select assignee...'}
                      </option>
                      {users.map((user) => (
                        <option key={user._id} value={user._id}>
                          👤 {user.name || user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Reason (Optional)</label>
                    <textarea
                      value={reassignReason}
                      onChange={(e) => setReassignReason(e.target.value)}
                      placeholder="Why are you reassigning..."
                      className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="3"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowReassignModal(false);
                        setSelectedAssignee(null);
                        setReassignReason('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleReassignTask}
                      disabled={isProcessing || !selectedAssignee}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      {isProcessing ? 'Reassigning...' : 'Reassign'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Timeline Modal */}
          {showTimeline && timeline && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
              <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Task Timeline</h3>
                    <button
                      onClick={() => setShowTimeline(false)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    >
                      <X size={20} className="text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {timeline.timeline?.map((event, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-900"></div>
                          {idx < timeline.timeline.length - 1 && (
                            <div className="w-0.5 h-12 bg-slate-300 dark:bg-slate-600"></div>
                          )}
                        </div>
                        <div className="pb-8">
                          <p className="font-medium text-slate-900 dark:text-white">{event.type}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{event.description}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                            {new Date(event.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowTimeline(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
