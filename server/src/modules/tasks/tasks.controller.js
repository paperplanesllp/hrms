import { tasksService } from './tasks.service.js';
import { Task } from './Task.model.js';
import { sendSuccess, sendError } from '../../utils/responseHelpers.js';
import {
  notifyTaskCreated,
  notifyTaskUpdated,
  notifyTaskStatusChanged,
  notifyTaskDeleted
} from '../../utils/socket.js';
import { createActivityLog } from '../activity/activity.service.js';
import { createTaskNotification, notifyTaskCompletedWithRemarks } from '../../utils/notificationHelper.js';
import {
  TASK_TIMING_STATE,
  calculateDueTime,
  calculateRemainingTime,
  extendTaskTime,
  logTaskTimingSnapshot,
  markTaskRejected,
  formatToIST,
  syncTaskTimingFields,
} from './taskDeadline.utils.js';
import { formatTaskCollection, formatTaskResponse } from './taskResponseFormatter.js';

export const tasksController = {
  // Get my tasks
  async getMyTasks(req, res) {
    try {
      console.log('📡 [Controller] getMyTasks called');
      console.log('👤 [Controller] req.user:', req.user);
      
      const userId = req.user.id;
      
      if (!userId) {
        console.error('❌ [Controller] No userId in request');
        return sendError(res, 'User ID not found in request', 401);
      }
      
      console.log('✅ [Controller] User ID extracted:', userId, 'Type:', typeof userId);
      
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        from: req.query.from,
        to: req.query.to,
        search: req.query.search,
        limit: parseInt(req.query.limit) || 500,
        sort: req.query.sort
      };
      
      const tasks = await tasksService.getMyTasks(userId, filters);
      console.log('📦 [Controller] Returning', tasks.length, 'tasks');
      sendSuccess(res, formatTaskCollection(tasks), 'Tasks fetched successfully');
    } catch (error) {
      console.error('❌ [Controller] Error in getMyTasks:', error.message);
      console.error('Stack:', error.stack);
      sendError(res, error.message, 400);
    }
  },

  // Get all tasks (admin/HR)
  async getAllTasks(req, res) {
    try {
      const filters = {
        status: req.query.status,
        department: req.query.department,
        priority: req.query.priority,
        from: req.query.from,
        to: req.query.to,
        search: req.query.search,
        limit: parseInt(req.query.limit) || 100
      };
      
      const tasks = await tasksService.getAllTasks(filters);
      sendSuccess(res, formatTaskCollection(tasks), 'All tasks fetched successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Get tasks assigned by current user (tasks they created and assigned to others)
  async getMyAssignedTasks(req, res) {
    try {
      console.log('📡 [Controller] getMyAssignedTasks called');
      
      const userId = req.user.id;
      
      if (!userId) {
        console.error('❌ [Controller] No userId in request');
        return sendError(res, 'User ID not found in request', 401);
      }
      
      console.log('✅ [Controller] User ID extracted:', userId);
      
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        search: req.query.search,
        limit: parseInt(req.query.limit) || 500
      };
      
      const tasks = await tasksService.getAssignedByUser(userId, filters);
      console.log('📦 [Controller] Returning', tasks.length, 'assigned tasks');
      sendSuccess(res, formatTaskCollection(tasks), 'Assigned tasks fetched successfully');
    } catch (error) {
      console.error('❌ [Controller] Error in getMyAssignedTasks:', error.message);
      sendError(res, error.message, 400);
    }
  },

  // Create new task (admin/HR)
  async createTask(req, res) {
    try {
      const taskData = {
        title: req.body.title,
        description: req.body.description,
        dueDate: req.body.dueDate,
        priority: req.body.priority || 'MEDIUM',
        status: req.body.status || 'pending',
        assignedTo: req.body.assignedTo,
        department: req.body.department || undefined,
        progress: req.body.progress || 0,
        tags: req.body.tags || [],
        estimatedHours: req.body.estimatedHours ? parseInt(req.body.estimatedHours) : 0,
        estimatedMinutes: req.body.estimatedMinutes ? parseInt(req.body.estimatedMinutes) : 0,
        estimatedTotalMinutes: req.body.estimatedTotalMinutes || 0,
        attachments: []
      };
      
      // Process uploaded files
      if (req.files && req.files.length > 0) {
        console.log('📁 [Controller] Processing', req.files.length, 'attachments');
        taskData.attachments = req.files.map(file => {
          // Generate URL path for the uploaded file
          const fileUrl = `/uploads/documents/${file.filename}`;
          console.log('✅ [Controller] Added attachment:', fileUrl);
          return fileUrl;
        });
      }
      
      const task = await tasksService.createTask(taskData, req.user.id);
      
      // 🔔 Emit socket event for real-time update
      console.log('📡 [Socket] Emitting task:created event');
      notifyTaskCreated(task, req.user.id);

      // Log activity
      createActivityLog({
        actorId: req.user.id,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_CREATE',
        module: 'TASK',
        description: `${req.user.name || 'User'} created task "${task.title}"`,
        metadata: { taskId: task._id, title: task.title, priority: task.priority },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});
      
      sendSuccess(res, formatTaskResponse(task), 'Task created successfully', 201);
    } catch (error) {
      console.error('❌ [Controller] Error in createTask:', error);
      sendError(res, error.message, 400);
    }
  },

  // Update task status (self - complete/in-progress)
  async updateTaskStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, completionRemarks, totalWorkedMilliseconds, totalPausedMilliseconds } = req.body;
      
      // For completion, require remarks and validate minimum length
      if (status === 'completed') {
        if (!completionRemarks || completionRemarks.trim().length < 25) {
          return sendError(res, 'Completion remarks must be at least 25 characters', 400);
        }
      }
      
      const completionData = {
        completionRemarks,
        totalWorkedMilliseconds,
        totalPausedMilliseconds
      };
      
      const task = await tasksService.updateTaskStatus(id, req.user.id, status, completionData);
      
      // 🔔 Send notifications for task completion
      if (status === 'completed' && completionRemarks) {
        notifyTaskCompletedWithRemarks(
          id,
          req.user.id,
          task.assignedBy?._id || task.assignedBy,
          completionRemarks
        ).catch(err => console.error('Notification error:', err));
      }
      
      // 🔔 Emit socket event for real-time update
      console.log('📡 [Socket] Emitting task:status-changed event');
      notifyTaskStatusChanged(task, req.user.id);

      // Log activity
      createActivityLog({
        actorId: req.user.id,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_STATUS_CHANGE',
        module: 'TASK',
        description: `${req.user.name || 'User'} completed task "${task.title}"${completionRemarks ? ' with completion remark' : ''}`,
        metadata: { taskId: task._id, title: task.title, status, hasRemark: !!completionRemarks },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});
      
      sendSuccess(res, formatTaskResponse(task), `Task marked as ${status}`);
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Update task details (admin/HR or task owner/assignee)
  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      const existingTask = await tasksService.getTaskById(id);
      if (!existingTask) {
        return sendError(res, 'Task not found', 404);
      }

      const requesterId = req.user.id;
      const role = (req.user.role || '').toUpperCase();
      const isAdminOrHR = role === 'ADMIN' || role === 'HR';
      const isCreator = existingTask.assignedBy?._id?.toString() === requesterId;
      const isAssignee = existingTask.assignedTo?.some(a => a?._id?.toString() === requesterId || a?.toString() === requesterId);

      if (!isAdminOrHR && !isCreator && !isAssignee) {
        console.warn('❌ [Controller] updateTask forbidden for user', requesterId, 'on task', id);
        return sendError(res, 'Forbidden: You do not have permission to update this task', 403);
      }

      // Process uploaded files if present
      if (req.files && req.files.length > 0) {
        console.log('📁 [Controller] Processing', req.files.length, 'attachments for update');
        const newAttachments = req.files.map(file => {
          const fileUrl = `/uploads/documents/${file.filename}`;
          console.log('✅ [Controller] Added attachment:', fileUrl);
          return fileUrl;
        });

        // If there are existing attachments, append to them; otherwise set new ones
        if (updateData.attachments && Array.isArray(updateData.attachments)) {
          updateData.attachments = [...updateData.attachments, ...newAttachments];
        } else {
          updateData.attachments = newAttachments;
        }
      }

      const task = await tasksService.updateTask(id, updateData);

      // 🔔 Emit socket event for real-time update
      console.log('📡 [Socket] Emitting task:updated event');
      notifyTaskUpdated(task, req.user.id);

      // Log activity
      createActivityLog({
        actorId: req.user.id,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_UPDATE',
        module: 'TASK',
        description: `${req.user.name || 'User'} updated task "${task.title}"`,
        metadata: { taskId: task._id, title: task.title },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      sendSuccess(res, formatTaskResponse(task), 'Task updated successfully');
    } catch (error) {
      console.error('❌ [Controller] Error in updateTask:', error);
      sendError(res, error.message, 400);
    }
  },

  // Delete task (admin/HR or own assignment)
  async deleteTask(req, res) {
    try {
      const { id } = req.params;

      // Fetch task to validate existing and check ownership
      const task = await tasksService.getTaskById(id);
      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      const requesterId = req.user.id;
      const role = (req.user.role || '').toUpperCase();
      const isAdminOrHR = role === 'ADMIN' || role === 'HR';
      const isCreator = task.assignedBy?._id?.toString() === requesterId;
      const isAssignee = task.assignedTo?.some(a => a?._id?.toString() === requesterId || a?.toString() === requesterId);

      if (!isAdminOrHR && !isCreator && !isAssignee) {
        console.warn('❌ [Controller] deleteTask forbidden for user', requesterId, 'on task', id);
        return sendError(res, 'Forbidden: You do not have permission to delete this task', 403);
      }

      await tasksService.deleteTask(id);

      // 🔔 Emit socket event for real-time update
      console.log('📡 [Socket] Emitting task:deleted event');
      notifyTaskDeleted(id, task?.title || 'Unknown Task', requesterId, task.assignedTo || []);

      // Log activity
      createActivityLog({
        actorId: req.user.id,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_DELETE',
        module: 'TASK',
        description: `${req.user.name || 'User'} deleted task "${task.title || 'Unknown'}"`,
        metadata: { taskId: id, title: task.title },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      sendSuccess(res, {}, 'Task deleted successfully', 200);
    } catch (error) {
      console.error('❌ [Controller] deleteTask error:', error);
      sendError(res, error.message, 400);
    }
  },

  // Get task stats for dashboard
  async getTaskStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await tasksService.getTaskStats(userId);
      sendSuccess(res, stats, 'Task stats fetched');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Get dashboard pending tasks
  async getDashboardTasks(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 5;
      const tasks = await tasksService.getDashboardTasks(userId, limit);
      sendSuccess(res, formatTaskCollection(tasks), 'Dashboard tasks fetched');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  async getTaskById(req, res) {
    try {
      const { id } = req.params;
      const task = await tasksService.getTaskById(id);
      if (!task) return sendError(res, 'Task not found', 404);

      sendSuccess(res, formatTaskResponse(task), 'Task fetched successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Get all tasks analytics (admin/HR only)
  async getAllTasksAnalytics(req, res) {
    try {
      const dateRange = req.query.dateRange || 'month';
      const analytics = await tasksService.getAllTasksAnalytics(dateRange);
      sendSuccess(res, analytics, 'Analytics fetched successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Get team performance analytics (admin/HR only)
  async getTeamPerformanceAnalytics(req, res) {
    try {
      const dateRange = req.query.dateRange || 'month';
      const performance = await tasksService.getTeamPerformanceAnalytics(dateRange);
      sendSuccess(res, performance, 'Team performance analytics fetched successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Get task completion trends
  async getTaskCompletionTrends(req, res) {
    try {
      const { days = 7 } = req.query;
      const userId = req.query.userId || req.user.id;
      
      const trends = await tasksService.getTaskCompletionTrends(userId, parseInt(days));
      sendSuccess(res, trends, 'Task completion trends fetched successfully');
    } catch (error) {
      console.error('Error fetching trends:', error);
      sendError(res, error.message, 400);
    }
  },

  // Diagnostic endpoint - debug why tasks aren't showing
  async getTasksDiagnostics(req, res) {
    try {
      const userId = req.user.id;
      const diagnostics = await tasksService.getTasksDiagnostics(userId);
      sendSuccess(res, diagnostics, 'Diagnostic info fetched');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // ─── WORKFLOW MANAGEMENT ───────────────────────────────────────────────────────────

  // Hold task
  async holdTask(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return sendError(res, 'Hold reason is required', 400);
      }

      const task = await tasksService.holdTask(id, req.user.id, reason);

      // 🔔 Emit socket event
      notifyTaskStatusChanged(task, req.user.id);

      // Log activity
      createActivityLog({
        actorId: req.user.id,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_STATUS_CHANGE',
        module: 'TASK',
        description: `${req.user.name || 'User'} held task "${task.title}" - Reason: ${reason}`,
        metadata: { taskId: task._id, title: task.title, status: 'on-hold', reason },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      sendSuccess(res, formatTaskResponse(task), 'Task placed on hold successfully');
    } catch (error) {
      console.error('❌ [Controller] Error in holdTask:', error.message);
      sendError(res, error.message, 400);
    }
  },

  // Resume task from hold
  async resumeTaskFromHold(req, res) {
    try {
      const { id } = req.params;

      const task = await tasksService.resumeTaskFromHold(id, req.user.id);

      // 🔔 Emit socket event
      notifyTaskStatusChanged(task, req.user.id);

      // Log activity
      createActivityLog({
        actorId: req.user.id,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_STATUS_CHANGE',
        module: 'TASK',
        description: `${req.user.name || 'User'} resumed task "${task.title}"`,
        metadata: { taskId: task._id, title: task.title, status: 'in-progress' },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      sendSuccess(res, formatTaskResponse(task), 'Task resumed successfully');
    } catch (error) {
      console.error('❌ [Controller] Error in resumeTaskFromHold:', error.message);
      sendError(res, error.message, 400);
    }
  },

  // Reassign task to another user
  async reassignTask(req, res) {
    try {
      const { id } = req.params;
      const { newAssigneeId, reason } = req.body;

      if (!newAssigneeId) {
        return sendError(res, 'New assignee ID is required', 400);
      }

      const task = await tasksService.reassignTask(id, newAssigneeId, reason, req.user.id);

      // 🔔 Emit socket event
      notifyTaskUpdated(task, req.user.id);

      // Log activity
      createActivityLog({
        actorId: req.user.id,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_UPDATE',
        module: 'TASK',
        description: `${req.user.name || 'User'} reassigned task "${task.title}"`,
        metadata: { 
          taskId: task._id, 
          title: task.title, 
          newAssigneeId, 
          reason: reason || 'No reason provided'
        },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      sendSuccess(res, formatTaskResponse(task), 'Task reassigned successfully');
    } catch (error) {
      console.error('❌ [Controller] Error in reassignTask:', error.message);
      sendError(res, error.message, 400);
    }
  },

  // Get task timeline
  async getTaskTimeline(req, res) {
    try {
      const { id } = req.params;
      const timeline = await tasksService.getTaskTimeline(id);
      sendSuccess(res, timeline, 'Task timeline fetched successfully');
    } catch (error) {
      console.error('❌ [Controller] Error in getTaskTimeline:', error.message);
      sendError(res, error.message, 400);
    }
  },

  // Check workload for a user
  async checkWorkload(req, res) {
    try {
      const { userId } = req.params;
      const workload = await tasksService.checkWorkload(userId);
      sendSuccess(res, workload, 'Workload check completed');
    } catch (error) {
      console.error('❌ [Controller] Error in checkWorkload:', error.message);
      sendError(res, error.message, 400);
    }
  },

  // Dashboard metrics with completion rate
  async getDashboardMetrics(req, res) {
    try {
      const userId = req.user.id;
      const metrics = await tasksService.getAllTasksAnalytics('month');
      sendSuccess(res, metrics, 'Dashboard metrics fetched successfully');
    } catch (error) {
      console.error('❌ [Controller] Error in getDashboardMetrics:', error.message);
      sendError(res, error.message, 400);
    }
  },

  // ─── TIMER ACTIONS ───────────────────────────────────────────────────────────

  // Start task timer
  async startTask(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findOne({ _id: id, isDeleted: false });
      if (!task) return sendError(res, 'Task not found', 404);

      if (!task.assignedTo.some(a => a.toString() === req.user.id)) {
        return sendError(res, 'Only an assignee can start this task', 403);
      }
      if (task.status === 'completed') {
        return sendError(res, 'Cannot start a completed task', 400);
      }
      if (['rejected', 'cancelled'].includes(task.status)) {
        return sendError(res, `Cannot start a ${task.status} task`, 400);
      }
      if (task.isRunning) {
        return sendError(res, 'Task is already running', 400);
      }

      const now = new Date();

      // Legacy recovery path: task is already in an active status but running flag was not persisted.
      const hasActiveStatus = ['in-progress', 'due-soon', 'overdue', 'extended'].includes(task.status);
      if (hasActiveStatus && task.startedAt && !task.isPaused) {
        task.isRunning = true;
        task.isPaused = false;
        task.currentSessionStartTime = now;
        task.timingState = TASK_TIMING_STATE.IN_PROGRESS;

        syncTaskTimingFields(task, now);
        logTaskTimingSnapshot(task, now, 'startTask:resume-legacy');

        await task.save();
        await task.populate([
          { path: 'assignedTo', select: 'name email' },
          { path: 'assignedBy', select: 'name email' },
          { path: 'department', select: 'name' }
        ]);
        notifyTaskStatusChanged(task, req.user.id);
        return sendSuccess(res, formatTaskResponse(task), 'Task resumed successfully');
      }

      task.status = 'in-progress';
      task.timingState = TASK_TIMING_STATE.IN_PROGRESS;
      task.isRunning = true;
      task.isPaused = false;
      task.currentSessionStartTime = now;
      task.startedAt = now;
      task.totalActiveTimeInSeconds = 0;

      // Reset active timing window on fresh start
      task.totalPausedTimeInSeconds = 0;
      task.pausedDurationMs = 0;
      task.pausedDurationMinutes = 0;
      task.pauseEntries = [];

      syncTaskTimingFields(task, now);

      task.thirtyMinReminderSent = false;
      task.fifteenMinReminderSent = false;
      task.dueNowReminderSent = false;
      task.overdueReminderSent = false;

      logTaskTimingSnapshot(task, now, 'startTask');

      await task.save();
      await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' },
        { path: 'department', select: 'name' }
      ]);
      notifyTaskStatusChanged(task, req.user.id);
      sendSuccess(res, formatTaskResponse(task), 'Task started successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Pause task timer with reason
  async pauseTask(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason?.trim()) {
        return sendError(res, 'Pause reason is required', 400);
      }

      const task = await Task.findOne({ _id: id, isDeleted: false });
      if (!task) return sendError(res, 'Task not found', 404);

      if (!task.assignedTo.some(a => a.toString() === req.user.id)) {
        return sendError(res, 'Only an assignee can pause this task', 403);
      }
      const hasRunningStatus = ['in-progress', 'due-soon', 'overdue', 'extended'].includes(task.status);
      if (!task.isRunning && !hasRunningStatus) {
        return sendError(res, 'Task is not currently running', 400);
      }

      const now = new Date();
      if (!Array.isArray(task.pauseEntries)) task.pauseEntries = [];
      task.totalActiveTimeInSeconds = Number(task.totalActiveTimeInSeconds) || 0;

      // Accumulate active session time
      if (task.currentSessionStartTime) {
        const sessionSeconds = Math.max(
          0,
          Math.floor((now - new Date(task.currentSessionStartTime)) / 1000)
        );
        task.totalActiveTimeInSeconds += sessionSeconds;
      }

      task.status = 'paused';
      task.timingState = TASK_TIMING_STATE.PAUSED;
      task.isRunning = false;
      task.isPaused = true;
      task.currentSessionStartTime = null;
      task.pauseEntries.push({
        reason: reason.trim(),
        pausedAt: now,
        resumedAt: null,
        pausedDurationInSeconds: 0
      });

      logTaskTimingSnapshot(task, now, 'pauseTask');

      await task.save();
      await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' },
        { path: 'department', select: 'name' }
      ]);
      notifyTaskStatusChanged(task, req.user.id);
      sendSuccess(res, formatTaskResponse(task), 'Task paused successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Resume task timer
  async resumeTask(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findOne({ _id: id, isDeleted: false });
      if (!task) return sendError(res, 'Task not found', 404);

      if (!task.assignedTo.some(a => a.toString() === req.user.id)) {
        return sendError(res, 'Only an assignee can resume this task', 403);
      }
      const hasPausedStatus = task.status === 'paused' || task.status === 'on-hold';
      if (!task.isPaused && !hasPausedStatus) {
        return sendError(res, 'Task is not paused', 400);
      }

      const now = new Date();
      if (!Array.isArray(task.pauseEntries)) task.pauseEntries = [];
      task.totalPausedTimeInSeconds = Number(task.totalPausedTimeInSeconds) || 0;
      task.pausedDurationMs = Number(task.pausedDurationMs) || 0;

      // Close the last open pause entry
      const lastPause = task.pauseEntries[task.pauseEntries.length - 1];
      if (lastPause && !lastPause.resumedAt) {
        const pausedSeconds = Math.max(
          0,
          Math.floor((now - new Date(lastPause.pausedAt)) / 1000)
        );
        lastPause.resumedAt = now;
        lastPause.pausedDurationInSeconds = pausedSeconds;
        task.totalPausedTimeInSeconds += pausedSeconds;
        task.pausedDurationMs += pausedSeconds * 1000;
        task.pausedDurationMinutes = Math.floor(task.pausedDurationMs / 60000);
      }

      task.status = 'in-progress';
      task.timingState = TASK_TIMING_STATE.IN_PROGRESS;
      task.isRunning = true;
      task.isPaused = false;
      task.currentSessionStartTime = now;

      logTaskTimingSnapshot(task, now, 'resumeTask');

      await task.save();
      await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' },
        { path: 'department', select: 'name' }
      ]);
      notifyTaskStatusChanged(task, req.user.id);
      sendSuccess(res, formatTaskResponse(task), 'Task resumed successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Complete task with timer finalization and mandatory completion remark
  async completeTask(req, res) {
    try {
      const { id } = req.params;
      const { completionRemark } = req.body;

      // Validate completion remark
      if (!completionRemark || typeof completionRemark !== 'string') {
        return sendError(res, 'Completion remark is required', 400);
      }

      const trimmedRemark = completionRemark.trim();
      if (trimmedRemark.length < 25) {
        return sendError(res, 'Completion remark must be at least 25 characters long', 400);
      }

      if (trimmedRemark.length > 5000) {
        return sendError(res, 'Completion remark cannot exceed 5000 characters', 400);
      }

      const task = await Task.findOne({ _id: id, isDeleted: false });
      if (!task) return sendError(res, 'Task not found', 404);

      if (!task.assignedTo.some(a => a.toString() === req.user.id)) {
        return sendError(res, 'Only an assignee can complete this task', 403);
      }
      if (task.status === 'completed') {
        return sendError(res, 'Task is already completed', 400);
      }

      const now = new Date();
      if (!Array.isArray(task.pauseEntries)) task.pauseEntries = [];
      task.totalActiveTimeInSeconds = Number(task.totalActiveTimeInSeconds) || 0;
      task.totalPausedTimeInSeconds = Number(task.totalPausedTimeInSeconds) || 0;
      task.pausedDurationMs = Number(task.pausedDurationMs) || 0;

      // Finalize running session
      if (task.isRunning && task.currentSessionStartTime) {
        const sessionSeconds = Math.max(
          0,
          Math.floor((now - new Date(task.currentSessionStartTime)) / 1000)
        );
        task.totalActiveTimeInSeconds += sessionSeconds;
      }

      // Close any open pause entry
      if (task.isPaused) {
        const lastPause = task.pauseEntries[task.pauseEntries.length - 1];
        if (lastPause && !lastPause.resumedAt) {
          const pausedSeconds = Math.max(
            0,
            Math.floor((now - new Date(lastPause.pausedAt)) / 1000)
          );
          lastPause.resumedAt = now;
          lastPause.pausedDurationInSeconds = pausedSeconds;
          task.totalPausedTimeInSeconds += pausedSeconds;
          task.pausedDurationMs += pausedSeconds * 1000;
          task.pausedDurationMinutes = Math.floor(task.pausedDurationMs / 60000);
        }
      }

      // Save completion remark
      task.completionRemarks = trimmedRemark;
      task.completedBy = req.user.id;

      task.status = 'completed';
      task.timingState = TASK_TIMING_STATE.COMPLETED;
      task.completedAt = now;
      task.progress = 100;
      task.isRunning = false;
      task.isPaused = false;
      task.currentSessionStartTime = null;
      syncTaskTimingFields(task, now);

      const completionDueAt = task.dueAt || calculateDueTime(task.startedAt, task.estimatedMinutes, task.pausedDurationMs) || task.dueDate;
      task.completedOnTime = completionDueAt ? now <= new Date(completionDueAt) : null;

      logTaskTimingSnapshot(task, now, 'completeTask');

      // Log activity
      createActivityLog({
        actorId: req.user.id,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_COMPLETION',
        module: 'TASK',
        description: `Completed task "${task.title}" with summary`,
        metadata: { taskId: task._id, title: task.title, hasRemark: !!trimmedRemark },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      await task.save();
      await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' },
        { path: 'completedBy', select: 'name email' },
        { path: 'department', select: 'name' }
      ]);
      notifyTaskStatusChanged(task, req.user.id);
      sendSuccess(res, formatTaskResponse(task), 'Task completed successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Request more time for overdue task
  async requestTaskExtension(req, res) {
    try {
      const taskId = req.params.id || req.body.taskId;
      const { additionalTime, unit = 'minutes', remarks } = req.body;

      const task = await Task.findOne({ _id: taskId, isDeleted: false });
      if (!task) return sendError(res, 'Task not found', 404);

      if (!task.assignedTo.some(a => a.toString() === req.user.id)) {
        return sendError(res, 'Only an assignee can request more time', 403);
      }

      const effectiveDueAt = task.dueAt || task.dueDate;
      const now = new Date();
      const dueDatePassed = effectiveDueAt && now > new Date(effectiveDueAt);

      // Also allow when estimated time is exhausted (active time >= estimated minutes)
      const estimatedSeconds = ((task.estimatedHours || 0) * 3600) + ((task.estimatedMinutes || 0) * 60);
      let activeSeconds = task.totalActiveTimeInSeconds || 0;
      if (task.isRunning && task.currentSessionStartTime) {
        activeSeconds += Math.floor((now - new Date(task.currentSessionStartTime)) / 1000);
      }
      const estimatedTimeUp = estimatedSeconds > 0 && activeSeconds >= estimatedSeconds;

      if (!dueDatePassed && !estimatedTimeUp) {
        return sendError(res, 'Extension request is allowed only when overdue or estimated time is exhausted', 400);
      }

      const parsedTime = Number(additionalTime);
      if (!Number.isFinite(parsedTime) || parsedTime <= 0) {
        return sendError(res, 'Additional time must be a positive number', 400);
      }

      const additionalMinutes = unit === 'hours'
        ? Math.round(parsedTime * 60)
        : Math.round(parsedTime);

      if (additionalMinutes <= 0) {
        return sendError(res, 'Additional time must be at least 1 minute', 400);
      }

      const MAX_EXTENSION_REQUESTS = 5;
      if ((task.extensionRequests?.length || 0) >= MAX_EXTENSION_REQUESTS) {
        return sendError(res, 'Maximum extension requests reached for this task', 400);
      }

      const hasPendingRequest = (task.extensionRequests || []).some(r => r.approvalStatus === 'pending');
      if (hasPendingRequest) {
        return sendError(res, 'An extension request is already pending approval', 400);
      }

      const safeRemarks = `${remarks || ''}`.trim();
      if (!safeRemarks) {
        return sendError(res, 'Remarks are required', 400);
      }

      task.status = 'extension_requested';
      task.requestedTime = additionalMinutes;
      task.requestRemarks = safeRemarks;
      task.requestedBy = req.user.id;
      task.requestedAt = new Date();
      task.approvalStatus = 'pending';

      task.extensionRequests.push({
        requestedTimeMinutes: additionalMinutes,
        requestRemarks: safeRemarks,
        requestedBy: req.user.id,
        requestedAt: new Date(),
        approvalStatus: 'pending',
      });

      await task.save();
      await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' },
        { path: 'department', select: 'name' }
      ]);

      // Self-assigned → notify HR. Assigned by someone else → notify that person.
      const isSelfAssigned = task.assignedBy?.toString() === req.user.id ||
        task.assignedBy?._id?.toString() === req.user.id;

      if (isSelfAssigned) {
        const { User } = await import('../users/User.model.js');
        const hrUsers = await User.find({ role: { $in: ['HR', 'ADMIN'] }, isDeleted: false }).select('_id').lean();
        for (const hr of hrUsers) {
          await createTaskNotification({
            userId: hr._id,
            taskId: task._id,
            eventType: 'system',
            title: '⏳ Extension Request (Self-Assigned)',
            message: `${req.user.name || 'Employee'} requested +${additionalMinutes} min for self-assigned task "${task.title}". Remarks: ${safeRemarks}`,
            triggeredBy: req.user.id,
          }).catch(() => {});
        }
      } else if (task.assignedBy) {
        await createTaskNotification({
          userId: task.assignedBy._id || task.assignedBy,
          taskId: task._id,
          eventType: 'system',
          title: '⏳ Extension Request',
          message: `${req.user.name || 'Employee'} requested +${additionalMinutes} min for "${task.title}". Remarks: ${safeRemarks}`,
          triggeredBy: req.user.id,
        }).catch(() => {});
      }

      notifyTaskUpdated(task, req.user.id);
      sendSuccess(res, formatTaskResponse(task), 'Extension request submitted successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  async approveTaskExtension(req, res) {
    try {
      const { taskId, requestId } = req.body;
      const task = await Task.findOne({ _id: taskId, isDeleted: false });
      if (!task) return sendError(res, 'Task not found', 404);

      // Self-assigned tasks: HR/Admin can approve. Otherwise only the assigner.
      const isSelfAssignedTask = Array.isArray(task.assignedTo) &&
        task.assignedTo.some(a => a.toString() === (task.assignedBy?._id || task.assignedBy)?.toString());
      const approverRole = (req.user.role || '').toUpperCase();
      const canApprove = task.assignedBy?.toString() === req.user.id ||
        (isSelfAssignedTask && (approverRole === 'HR' || approverRole === 'ADMIN'));
      if (!canApprove) {
        return sendError(res, 'Only the task assigner (or HR/Admin for self-assigned tasks) can approve', 403);
      }

      const requests = task.extensionRequests || [];
      const pendingIndex = requestId
        ? requests.findIndex(r => r._id.toString() === requestId && r.approvalStatus === 'pending')
        : requests.map((r, idx) => ({ r, idx })).reverse().find(({ r }) => r.approvalStatus === 'pending')?.idx;

      if (pendingIndex === undefined || pendingIndex < 0) {
        return sendError(res, 'No pending extension request found', 400);
      }

      const pendingRequest = requests[pendingIndex];
      pendingRequest.approvalStatus = 'approved';
      pendingRequest.approvedBy = req.user.id;
      pendingRequest.approvedAt = new Date();

      task.approvalStatus = 'approved';

      extendTaskTime(task, pendingRequest.requestedTimeMinutes, req.user.id, pendingRequest.requestRemarks);
      task.status = 'extended';

      const currentDue = task.dueAt || task.dueDate;

      await task.save();
      await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' },
      ]);

      if (pendingRequest.requestedBy) {
        await createTaskNotification({
          userId: pendingRequest.requestedBy,
          taskId: task._id,
          eventType: 'system',
          title: 'Extension Approved',
          message: `Your extension request for "${task.title}" was approved. New due time: ${formatToIST(currentDue)}`,
          triggeredBy: req.user.id,
        });
      }

      notifyTaskUpdated(task, req.user.id);
      sendSuccess(res, formatTaskResponse(task), 'Extension request approved successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  async rejectTaskExtension(req, res) {
    try {
      const { taskId, requestId, rejectionReason } = req.body;
      const reason = `${rejectionReason || ''}`.trim();
      if (!reason) {
        return sendError(res, 'Rejection reason is required', 400);
      }

      const task = await Task.findOne({ _id: taskId, isDeleted: false });
      if (!task) return sendError(res, 'Task not found', 404);

      // Self-assigned tasks: HR/Admin can reject. Otherwise only the assigner.
      const isSelfAssignedTaskR = Array.isArray(task.assignedTo) &&
        task.assignedTo.some(a => a.toString() === (task.assignedBy?._id || task.assignedBy)?.toString());
      const rejecterRole = (req.user.role || '').toUpperCase();
      const canReject = task.assignedBy?.toString() === req.user.id ||
        (isSelfAssignedTaskR && (rejecterRole === 'HR' || rejecterRole === 'ADMIN'));
      if (!canReject) {
        return sendError(res, 'Only the task assigner (or HR/Admin for self-assigned tasks) can reject', 403);
      }

      const requests = task.extensionRequests || [];
      const pendingIndex = requestId
        ? requests.findIndex(r => r._id.toString() === requestId && r.approvalStatus === 'pending')
        : requests.map((r, idx) => ({ r, idx })).reverse().find(({ r }) => r.approvalStatus === 'pending')?.idx;

      if (pendingIndex === undefined || pendingIndex < 0) {
        return sendError(res, 'No pending extension request found', 400);
      }

      const pendingRequest = requests[pendingIndex];
      pendingRequest.approvalStatus = 'rejected';
      pendingRequest.rejectedBy = req.user.id;
      pendingRequest.rejectedAt = new Date();
      pendingRequest.rejectionReason = reason;

      task.approvalStatus = 'rejected';
      task.status = 'overdue';

      task.remarks.push({
        type: 'note',
        text: `Extension rejected: ${reason}`,
        addedAt: new Date(),
        addedBy: req.user.id,
      });

      await task.save();
      await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' },
      ]);

      if (pendingRequest.requestedBy) {
        await createTaskNotification({
          userId: pendingRequest.requestedBy,
          taskId: task._id,
          eventType: 'system',
          title: 'Extension Rejected',
          message: `Your extension request for "${task.title}" was rejected. Please complete it immediately. Reason: ${reason}`,
          triggeredBy: req.user.id,
        });
      }

      notifyTaskStatusChanged(task, req.user.id);
      sendSuccess(res, formatTaskResponse(task), 'Extension request rejected successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Reject task with mandatory reason
  async rejectTask(req, res) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      const task = await Task.findOne({ _id: id, isDeleted: false });
      if (!task) return sendError(res, 'Task not found', 404);

      if (!task.assignedTo.some(a => a.toString() === req.user.id)) {
        return sendError(res, 'Only an assignee can reject this task', 403);
      }

      markTaskRejected(task, rejectionReason, req.user.id);
      await task.save();
      await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' },
        { path: 'department', select: 'name' }
      ]);

      if (task.assignedBy) {
        await createTaskNotification({
          userId: task.assignedBy._id,
          taskId: task._id,
          eventType: 'task-rejected',
          title: 'Task Rejected',
          message: `"${task.title}" was rejected. Reason: ${task.rejectionReason}`,
          triggeredBy: req.user.id,
        });
      }

      notifyTaskStatusChanged(task, req.user.id);
      sendSuccess(res, formatTaskResponse(task), 'Task rejected successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Get detailed time analysis for a task
  async getTaskAnalysis(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findOne({ _id: id, isDeleted: false })
        .populate('assignedTo', 'name email')
        .populate('assignedBy', 'name email');

      if (!task) return sendError(res, 'Task not found', 404);

      const now = new Date();

      let activeSeconds = task.totalActiveTimeInSeconds;
      if (task.isRunning && task.currentSessionStartTime) {
        activeSeconds += Math.max(
          0,
          Math.floor((now - new Date(task.currentSessionStartTime)) / 1000)
        );
      }

      let pausedSeconds = task.totalPausedTimeInSeconds;
      if (task.isPaused && task.pauseEntries.length > 0) {
        const last = task.pauseEntries[task.pauseEntries.length - 1];
        if (!last.resumedAt) {
          pausedSeconds += Math.max(
            0,
            Math.floor((now - new Date(last.pausedAt)) / 1000)
          );
        }
      }

      const totalTracked = activeSeconds + pausedSeconds;
      const productivityRatio = totalTracked > 0
        ? Math.round((activeSeconds / totalTracked) * 100)
        : 0;

      const lifecycleEnd = task.completedAt || now;
      const lifecycleSeconds = Math.floor(
        (lifecycleEnd - new Date(task.createdAt)) / 1000
      );

      sendSuccess(res, {
        taskId: task._id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        totalActiveTimeInSeconds: activeSeconds,
        totalPausedTimeInSeconds: pausedSeconds,
        lifecycleDurationInSeconds: lifecycleSeconds,
        pauseCount: task.pauseEntries.length,
        pauseEntries: task.pauseEntries,
        productivityRatio,
        isRunning: task.isRunning,
        isPaused: task.isPaused
      }, 'Task analysis fetched');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Trigger daily task reminders manually (for testing/on-demand)
  async triggerDailyReminder(req, res) {
    try {
      console.log('🔔 [Controller] Manual trigger of daily task reminders');
      
      // Check if user is admin/HR
      if (!req.user || req.user.role !== 'HR') {
        return sendError(res, 'Only HR/Admin can trigger reminders', 403);
      }
      
      const { triggerTaskReminderManually } = await import('./task.reminder.js');
      const result = await triggerTaskReminderManually();
      
      sendSuccess(res, result, 'Daily task reminders triggered successfully');
    } catch (error) {
      console.error('❌ [Controller] Error triggering daily reminders:', error);
      sendError(res, error.message, 400);
    }
  },

  // Get task reminder system status
  async getReminderStatus(req, res) {
    try {
      console.log('📊 [Controller] Getting task reminder system status');
      
      // Check if user is admin/HR
      if (!req.user || req.user.role !== 'HR') {
        return sendError(res, 'Only HR/Admin can view reminder status', 403);
      }
      
      const { getTaskReminderStatus } = await import('./task.reminder.js');
      const status = getTaskReminderStatus();
      
      sendSuccess(res, status, 'Reminder system status retrieved');
    } catch (error) {
      console.error('❌ [Controller] Error getting reminder status:', error);
      sendError(res, error.message, 400);
    }
  },

  // Get incomplete tasks summary for current user
  async getIncompleteSummary(req, res) {
    try {
      const userId = req.user.id;
      
      if (!userId) {
        return sendError(res, 'User ID not found', 401);
      }
      
      // Get incomplete tasks
      const incompleteTasks = await Task.find({
        assignedTo: userId,
        isDeleted: false,
        status: { $nin: ['completed', 'rejected', 'cancelled'] }
      }).select('title priority status dueDate dueAt');
      
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Categorize tasks
      const overdue = incompleteTasks.filter(t => {
        const dueDate = t.dueAt || t.dueDate;
        return dueDate && new Date(dueDate) < now;
      });
      
      const dueToday = incompleteTasks.filter(t => {
        const dueDate = t.dueAt || t.dueDate;
        return dueDate && new Date(dueDate) >= startOfDay && new Date(dueDate) <= endOfDay;
      });
      
      const urgent = incompleteTasks.filter(t => t.priority === 'URGENT');
      
      sendSuccess(res, {
        taskCounts: {
          total: incompleteTasks.length,
          overdue: overdue.length,
          dueToday: dueToday.length,
          urgent: urgent.length
        },
        tasks: {
          overdue: overdue.map(t => ({
            id: t._id,
            title: t.title,
            priority: t.priority,
            dueDate: t.dueAt || t.dueDate
          })),
          dueToday: dueToday.map(t => ({
            id: t._id,
            title: t.title,
            priority: t.priority,
            dueDate: t.dueAt || t.dueDate
          })),
          urgent: urgent.map(t => ({
            id: t._id,
            title: t.title,
            dueDate: t.dueAt || t.dueDate
          }))
        },
        retrievedAt: now
      }, 'Incomplete tasks summary retrieved');
    } catch (error) {
      console.error('❌ [Controller] Error getting incomplete summary:', error);
      sendError(res, error.message, 400);
    }
  },

  // ─── COMMENTS ───────────────────────────────────────────────────────────────

  async getComments(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findOne({ _id: id, isDeleted: false })
        .populate('comments.userId', 'name avatar email');
      if (!task) return sendError(res, 'Task not found', 404);
      // Ensure the requesting user is assigned to, assigned by, or is admin/HR
      const userId = req.user.id;
      const role = (req.user.role || '').toUpperCase();
      const isAdminOrHR = role === 'ADMIN' || role === 'HR';
      const isAssignee = task.assignedTo?.some(u => u.toString() === userId);
      const isAssigner = task.assignedBy?.toString() === userId;
      if (!isAdminOrHR && !isAssignee && !isAssigner) {
        return sendError(res, 'Access denied', 403);
      }
      sendSuccess(res, task.comments || [], 'Comments fetched');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { text } = req.body;
      if (!text?.trim()) return sendError(res, 'Comment text is required', 400);
      const task = await tasksService.addComment(id, req.user.id, text, req.user.name || 'Unknown');
      notifyTaskUpdated(task, req.user.id);
      sendSuccess(res, { comments: task.comments }, 'Comment added');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  async deleteComment(req, res) {
    try {
      const { id, commentId } = req.params;
      const task = await Task.findOne({ _id: id, isDeleted: false });
      if (!task) return sendError(res, 'Task not found', 404);
      const comment = task.comments.id(commentId);
      if (!comment) return sendError(res, 'Comment not found', 404);
      // Only the comment author or admin/HR can delete
      const role = (req.user.role || '').toUpperCase();
      const isAdminOrHR = role === 'ADMIN' || role === 'HR';
      if (!isAdminOrHR && comment.userId?.toString() !== req.user.id) {
        return sendError(res, 'Not authorized to delete this comment', 403);
      }
      task.comments.pull(commentId);
      await task.save();
      notifyTaskUpdated(task, req.user.id);
      sendSuccess(res, {}, 'Comment deleted');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // ─── REOPEN ─────────────────────────────────────────────────────────────────

  async reopenTask(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findOne({ _id: id, isDeleted: false })
        .populate('assignedTo', 'name email')
        .populate('assignedBy', 'name email');
      if (!task) return sendError(res, 'Task not found', 404);
      if (task.status !== 'completed') {
        return sendError(res, 'Only completed tasks can be reopened', 400);
      }
      const role = (req.user.role || '').toUpperCase();
      const isAdminOrHR = role === 'ADMIN' || role === 'HR';
      const isAssigner = task.assignedBy?._id?.toString() === req.user.id;
      if (!isAdminOrHR && !isAssigner) {
        return sendError(res, 'Only the task assigner or an admin can reopen this task', 403);
      }
      task.status = 'pending';
      task.completedAt = null;
      task.progress = 0;
      task.completionRemarks = null;
      // Reset timing so the assignee can start fresh
      task.isRunning = false;
      task.isPaused = false;
      await task.save();
      notifyTaskStatusChanged(task, req.user.id);
      sendSuccess(res, formatTaskResponse(task), 'Task reopened successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  }
};
