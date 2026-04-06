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
      sendSuccess(res, tasks, 'Tasks fetched successfully');
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
      sendSuccess(res, tasks, 'All tasks fetched successfully');
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
      sendSuccess(res, tasks, 'Assigned tasks fetched successfully');
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
      
      sendSuccess(res, task, 'Task created successfully', 201);
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
      
      sendSuccess(res, task, `Task updated to ${status}`);
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

      sendSuccess(res, task, 'Task updated successfully');
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
      sendSuccess(res, tasks, 'Dashboard tasks fetched');
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
      task.isRunning = true;
      task.isPaused = false;
      task.currentSessionStartTime = now;
      if (!task.startedAt) task.startedAt = now;

      await task.save();
      await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' },
        { path: 'department', select: 'name' }
      ]);
      notifyTaskStatusChanged(task, req.user.id);
      sendSuccess(res, task, 'Task started successfully');
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

      task.status = 'on-hold';
      task.isRunning = false;
      task.isPaused = true;
      task.currentSessionStartTime = null;
      task.pauseEntries.push({
        reason: reason.trim(),
        pausedAt: now,
        resumedAt: null,
        pausedDurationInSeconds: 0
      });

      await task.save();
      await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' },
        { path: 'department', select: 'name' }
      ]);
      notifyTaskStatusChanged(task, req.user.id);
      sendSuccess(res, task, 'Task paused successfully');
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
      }

      task.status = 'in-progress';
      task.isRunning = true;
      task.isPaused = false;
      task.currentSessionStartTime = now;

      await task.save();
      await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' },
        { path: 'department', select: 'name' }
      ]);
      notifyTaskStatusChanged(task, req.user.id);
      sendSuccess(res, task, 'Task resumed successfully');
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
        }
      }

      task.status = 'completed';
      task.completedAt = now;
      task.progress = 100;
      task.isRunning = false;
      task.isPaused = false;
      task.currentSessionStartTime = null;
      task.completedOnTime = now <= new Date(task.dueDate);

      await task.save();
      await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' },
        { path: 'department', select: 'name' }
      ]);
      notifyTaskStatusChanged(task, req.user.id);
      sendSuccess(res, task, 'Task completed successfully');
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
