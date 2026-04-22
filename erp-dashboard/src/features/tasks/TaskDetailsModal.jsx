import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, FileText, Download, Image, File, Paperclip, Eye, Clock, History, MessageSquare, Send, Trash2, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { taskService } from './taskService.js';
import { toast } from '../../store/toastStore.js';
import api from '../../lib/api.js';
import { getAuth } from '../../lib/auth.js';
import { useAuthStore } from '../../store/authStore.js';
import TimerChip from './components/TimerChip.jsx';
import ActivityTimeline from './components/ActivityTimeline.jsx';
import EstimatedTimeTimer from './components/EstimatedTimeTimer.jsx';
import { useTaskCountdown } from './hooks/useTaskTimer.js';
import { useEstimatedTimeCountdown } from './hooks/useEstimatedTimeCountdown.js';
import { calculateRemainingTime, formatToIST } from './utils/taskDeadlineUtils.js';
import { formatMilliseconds } from './utils/taskTimerUtils.js';
import {
  getPriorityStyles,
  getStatusStyles,
  getPriorityLabel,
  getStatusLabel,
  isTaskOverdue,
  getDaysUntilDue
} from './taskUtils.js';
import RequestExtensionModal from './modals/RequestExtensionModal.jsx';

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
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [completionRemark, setCompletionRemark] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Comments state
  const [comments, setComments] = useState(null);   // null = not loaded yet
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Get current user for permission checks
  const currentUser = useAuthStore((s) => s.user);

  // Helper function to check if current user can view completion remarks
  const canViewCompletionRemarks = () => {
    if (!currentUser || !task) return false;
    
    const isAdmin = currentUser.role === 'ADMIN';
    const isHR = currentUser.role === 'HR';
    const isTaskAssigner = task.assignedBy?._id === currentUser._id || task.assignedBy?.id === currentUser._id;
    const isCompletingEmployee = task.completedBy?._id === currentUser._id || task.completedBy?.id === currentUser._id;
    const isCurrentEmployee = task.assignedTo?._id === currentUser._id || task.assignedTo?.id === currentUser._id;
    
    return isAdmin || isHR || isTaskAssigner || isCompletingEmployee || isCurrentEmployee;
  };
  const quickRemarkChips = [
    'Work completed',
    'Shared with client',
    'Tested and verified',
    'Pending review',
    'Ready for deployment'
  ];

  const countdown = useTaskCountdown(task || {});
  const estimatedCountdown = useEstimatedTimeCountdown(task || {});
  const remaining = calculateRemainingTime(task || {});

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

  const auth = getAuth();
  const currentUserId = auth?.user?._id || auth?.user?.id;
  
  // Check if task is assigned only to current user
  const isAssignedOnlyToCurrentUser = () => {
    if (!task.assignedTo || task.assignedTo.length === 0) return false;
    if (task.assignedTo.length === 1) {
      const assignedUserId = task.assignedTo[0]?._id || task.assignedTo[0];
      return assignedUserId === currentUserId;
    }
    return false;
  };

  const effectiveDueAt = remaining.effectiveDueAt || task.dueAt || task.dueDate;
  const priorityStyles = getPriorityStyles(task.priority);
  const statusStyles = getStatusStyles(task.status);
  const isOverdue = countdown.shouldTrack ? countdown.isOverdue : isTaskOverdue(task.dueDate, task.status);

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

  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleStatusChange = async () => {
    if (task.status === 'completed') {
      // If already completed, allow marking back to pending
      const nextStatus = 'pending';
      if (onStatusChange) {
        await onStatusChange(task._id, nextStatus);
      }
    } else {
      // If not completed, show remark modal
      setShowCompleteModal(true);
    }
  };

  const handleCompleteTask = async () => {
    const remarkLength = completionRemark.trim().length;
    
    if (remarkLength < 10) {
      toast({ 
        title: `Remark must be at least 10 characters (currently ${remarkLength})`, 
        type: 'error' 
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Call the proper complete endpoint with completion remark
      await api.post(`/tasks/${task._id}/complete`, {
        completionRemark: completionRemark.trim()
      });

      toast({ 
        title: 'Task completed successfully',
        description: 'Task marked as done with completion summary.',
        type: 'success' 
      });
      
      setShowCompleteModal(false);
      setCompletionRemark('');
      
      if (onStatusChange) {
        await onStatusChange(task._id, 'completed');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast({ 
        title: 'Failed to complete task',
        description: error.response?.data?.message || error.message, 
        type: 'error' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickRemark = (chip) => {
    setCompletionRemark(prev => {
      if (prev.trim()) {
        return prev + ' ' + chip;
      }
      return chip;
    });
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

  const loadComments = async () => {
    if (commentsLoading) return;
    setCommentsLoading(true);
    try {
      const data = await taskService.getComments(task._id);
      setComments(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({ title: error.message || 'Failed to load comments', type: 'error' });
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments && comments === null) loadComments();
    setShowComments(p => !p);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await taskService.addComment(task._id, newComment.trim());
      setNewComment('');
      await loadComments();
    } catch (error) {
      toast({ title: error.message || 'Failed to add comment', type: 'error' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await taskService.deleteComment(task._id, commentId);
      setComments(prev => (Array.isArray(prev) ? prev.filter(c => (c._id || c.id) !== commentId) : prev));
    } catch (error) {
      toast({ title: error.message || 'Failed to delete comment', type: 'error' });
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

    // Show Request Extension button if task is overdue and user is assigned
    const isUserAssigned = task.assignedTo && task.assignedTo.some(u => u._id === currentUserId || u.id === currentUserId);
    const taskIsOverdue = isOverdue && task.status !== 'completed' && isUserAssigned;
    
    if (taskIsOverdue) {
      buttons.push(
        <Button
          key="extension"
          onClick={() => setShowExtensionModal(true)}
          disabled={isLoading || isProcessing}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <AlertCircle size={16} />
          Request Extension
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
            <div className="mt-3">
              <TimerChip
                countdown={countdown}
                isPaused={task.isPaused}
                dueTooltip={`Due: ${formatToIST(effectiveDueAt)}`}
              />
            </div>
            <div className="mt-2">
              <EstimatedTimeTimer countdown={estimatedCountdown} task={task} />
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

          {/* Completion Summary - Show for completed tasks with permission check */}
          {task.status === 'completed' && task.completionRemarks && canViewCompletionRemarks() && (
            <div className="p-4 rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
                <h3 className="text-sm font-bold text-green-900 dark:text-green-200">Completion Summary</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {task.completedBy && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Completed By</p>
                    <p className="text-green-900 dark:text-green-100">{task.completedBy?.name || task.completedBy?.email || 'Unknown'}</p>
                  </div>
                )}
                {task.completedAt && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Completed At</p>
                    <p className="text-green-900 dark:text-green-100">{formatToIST(new Date(task.completedAt))}</p>
                  </div>
                )}
                {/* On Time / Late indicator */}
                {task.completedAt && (task.dueDate || task.dueAt) && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Completion Status</p>
                    {new Date(task.completedAt) <= new Date(task.dueAt || task.dueDate) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100">
                        ✓ On Time
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-100">
                        ⚠ Completed Late
                      </span>
                    )}
                  </div>
                )}
                {task.totalWorkedMilliseconds > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Total Active Time</p>
                    <p className="text-green-900 dark:text-green-100 font-medium">
                      {formatMilliseconds(task.totalWorkedMilliseconds)}
                    </p>
                  </div>
                )}
                {task.totalPausedMilliseconds > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Total Paused Time</p>
                    <p className="text-green-900 dark:text-green-100">
                      {formatMilliseconds(task.totalPausedMilliseconds)}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Work Summary</p>
                <p className="text-sm text-green-900 dark:text-green-100 leading-relaxed bg-white dark:bg-slate-800/50 p-3 rounded border border-green-200 dark:border-green-700">
                  {task.completionRemarks}
                </p>
              </div>
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
                {formatToIST(effectiveDueAt)}
              </p>
              {isOverdue && (
                <p className="text-xs font-semibold text-red-600 dark:text-red-300 mt-1">
                  {countdown.shouldTrack ? countdown.display : `Overdue for ${Math.abs(getDaysUntilDue(task.dueDate))} days`}
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

            {/* Assigned To - Only show if assigned to someone else */}
            {task.assignedTo && task.assignedTo.length > 0 && !isAssignedOnlyToCurrentUser() && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Assigned To</p>
                <div className="space-y-2">
                  {task.assignedTo.map((user) => (
                    <div key={user._id || user} className="flex items-center gap-2">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600" />
                      )}
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {user.name || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
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

          {/* Comments Section */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <button
              onClick={handleToggleComments}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Comments {task.comments?.length > 0 ? `(${task.comments.length})` : ''}
                </span>
              </div>
              <span className="text-xs text-slate-400">{showComments ? '▲ Hide' : '▼ Show'}</span>
            </button>

            {showComments && (
              <div className="mt-4 space-y-3">
                {/* Comment Input */}
                <div className="flex gap-2">
                  <textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmitComment(); }}
                    placeholder="Add a comment... (Ctrl+Enter to send)"
                    rows={2}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 resize-none"
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submittingComment}
                    className="px-3 py-2 rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-slate-900 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed self-end transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {/* Comment List */}
                {commentsLoading && (
                  <p className="text-xs text-slate-400 text-center py-3">Loading comments…</p>
                )}
                {!commentsLoading && comments !== null && comments.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">No comments yet. Be the first to comment.</p>
                )}
                {!commentsLoading && comments?.length > 0 && (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {[...comments].reverse().map((c) => {
                      const cId = c._id || c.id;
                      const authorName = c.userId?.name || c.username || 'Unknown';
                      const isOwn = c.userId?._id === currentUser?._id || c.userId?.id === currentUser?._id || c.userId === currentUser?._id;
                      return (
                        <div key={cId} className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-brand-accent/20 flex items-center justify-center shrink-0 text-xs font-bold text-brand-accent">
                            {authorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{authorName}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400">
                                  {c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                                </span>
                                {isOwn && (
                                  <button
                                    onClick={() => handleDeleteComment(cId)}
                                    className="p-0.5 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Delete comment"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{c.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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

          {/* Complete Task Modal */}
          {showCompleteModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
              <Card className="w-full max-w-2xl my-8">
                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Complete Task</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Provide a work summary (minimum 10 characters)
                    </p>
                  </div>

                  {/* Task Details Summary */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Task</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{task.title}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Assigned By</p>
                        <p className="text-sm text-slate-900 dark:text-white">
                          {task.assignedBy?.name || task.assignedBy?.email || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Work Started</p>
                        <p className="text-sm text-slate-900 dark:text-white">
                          {task.startedAt ? formatToIST(new Date(task.startedAt)) : 'Not started'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Lifecycle Duration</p>
                        <p className="text-sm text-slate-900 dark:text-white font-medium">
                          {task.startedAt ? (() => {
                            const start = new Date(task.startedAt);
                            const end = task.completedAt ? new Date(task.completedAt) : new Date();
                            const totalMs = end - start;
                            const totalMinutes = Math.floor(totalMs / (1000 * 60));
                            const hours = Math.floor(totalMinutes / 60);
                            const minutes = totalMinutes % 60;
                            return `${hours}h ${minutes}m`;
                          })() : 'Not started'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Estimated Time</p>
                        <p className="text-sm text-slate-900 dark:text-white">
                          {task.estimatedMinutes && task.estimatedMinutes > 0 
                            ? `${Math.floor(task.estimatedMinutes / 60)}h ${task.estimatedMinutes % 60}m`
                            : 'No estimate set'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Total Worked Time</p>
                        <p className="text-sm text-slate-900 dark:text-white font-medium">
                          {task.totalActiveTimeInSeconds ? `${Math.floor(task.totalActiveTimeInSeconds / 3600)}h ${Math.floor((task.totalActiveTimeInSeconds % 3600) / 60)}m` : '0m'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Total Paused Time</p>
                        <p className="text-sm text-slate-900 dark:text-white">
                          {task.totalPausedTimeInSeconds ? `${Math.floor(task.totalPausedTimeInSeconds / 60)}m` : '0m'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Work Summary */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Work Summary / Completion Remark <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={completionRemark}
                      onChange={(e) => setCompletionRemark(e.target.value)}
                      placeholder="Describe what work was completed, outcomes, any challenges faced, etc..."
                      className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows="4"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Characters: <span className={`font-semibold ${completionRemark.trim().length < 10 ? 'text-red-500' : 'text-green-500'}`}>
                          {completionRemark.trim().length}/10 minimum
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Quick Chips */}
                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Quick Suggestions</p>
                    <div className="flex flex-wrap gap-2">
                      {quickRemarkChips.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => handleQuickRemark(chip)}
                          className="px-3 py-1.5 text-xs font-medium rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCompleteModal(false);
                        setCompletionRemark('');
                      }}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCompleteTask}
                      disabled={isProcessing || completionRemark.trim().length < 10}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      {isProcessing ? 'Completing...' : 'Submit & Complete'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Timeline Modal */}
          {showTimeline && timeline && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
              <Card className="w-full max-w-lg max-h-[85vh] overflow-y-auto">
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
                  <ActivityTimeline timeline={timeline.timeline || []} activityLog={[]} />
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => setShowTimeline(false)}>Close</Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Request Extension Modal */}
          {showExtensionModal && (
            <RequestExtensionModal
              isOpen={showExtensionModal}
              onClose={() => setShowExtensionModal(false)}
              task={task}
              onExtensionRequested={() => {
                setShowExtensionModal(false);
                // Optionally refresh task data here
              }}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
