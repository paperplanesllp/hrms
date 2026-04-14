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
import { createTaskNotification } from '../../utils/notificationHelper.js';
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
        limit: parseInt(req.query.limit) || 50,
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
        limit: parseInt(req.query.limit) || 50
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
      const { status } = req.body;
      
      const task = await tasksService.updateTaskStatus(id, req.user.id, status);
      
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
        description: `${req.user.name || 'User'} changed task "${task.title}" status to ${status}`,
        metadata: { taskId: task._id, title: task.title, status },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});
      
      sendSuccess(res, formatTaskResponse(task), `Task updated to ${status}`);
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
      notifyTaskDeleted(id, task?.title || 'Unknown Task', requesterId);

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
      const performance = await tasksService.getTeamPerformanceAnalytics();
      sendSuccess(res, performance, 'Team performance analytics fetched successfully');
    } catch (error) {
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
      if (task.isRunning) {
        return sendError(res, 'Task is already running', 400);
      }

      const now = new Date();
      task.status = 'in-progress';
      task.timingState = TASK_TIMING_STATE.IN_PROGRESS;
      task.isRunning = true;
      task.isPaused = false;
      task.currentSessionStartTime = now;
      task.startedAt = now;

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
      if (!task.isRunning) {
        return sendError(res, 'Task is not currently running', 400);
      }

      const now = new Date();

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

      syncTaskTimingFields(task, now);
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
      if (!task.isPaused) {
        return sendError(res, 'Task is not paused', 400);
      }

      const now = new Date();

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

      syncTaskTimingFields(task, now);
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

  // Complete task with timer finalization
  async completeTask(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findOne({ _id: id, isDeleted: false });
      if (!task) return sendError(res, 'Task not found', 404);

      if (!task.assignedTo.some(a => a.toString() === req.user.id)) {
        return sendError(res, 'Only an assignee can complete this task', 403);
      }
      if (task.status === 'completed') {
        return sendError(res, 'Task is already completed', 400);
      }

      const now = new Date();

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

      await task.save();
      await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' },
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
      if (!effectiveDueAt || new Date() <= new Date(effectiveDueAt)) {
        return sendError(res, 'Extension request is allowed only after task is overdue', 400);
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

      if (task.assignedBy && task.assignedBy._id?.toString() !== req.user.id) {
        await createTaskNotification({
          userId: task.assignedBy._id,
          taskId: task._id,
          eventType: 'system',
          title: 'Extension Request',
          message: `"${task.title}" has requested additional time. Requested: ${additionalMinutes} minutes. Remarks: ${safeRemarks}`,
          triggeredBy: req.user.id,
        });
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

      if (task.assignedBy?.toString() !== req.user.id) {
        return sendError(res, 'Only task assigner can approve extension requests', 403);
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

      if (task.assignedBy?.toString() !== req.user.id) {
        return sendError(res, 'Only task assigner can reject extension requests', 403);
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
  }
};
