/**
 * Task Execution Controller
 * Handles all task execution endpoints
 */

import { taskExecutionService } from './taskExecution.service.js';
import { Task } from './Task.model.js';
import { sendSuccess, sendError } from '../../utils/responseHelpers.js';
import { createActivityLog } from '../activity/activity.service.js';
import { notifyTaskStatusChanged } from '../../utils/socket.js';

export const taskExecutionController = {
  /**
   * POST /tasks/:id/start
   * Start a task
   */
  async startTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      console.log(`🚀 [startTask] Starting task ${id} by user ${userId}`);

      const task = await taskExecutionService.startTask(id, userId);

      // Emit socket event
      notifyTaskStatusChanged(task, userId).catch(() => {});

      // Log activity
      createActivityLog({
        actorId: userId,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_EXECUTION_START',
        module: 'TASK',
        description: `Started task "${task.title}"`,
        metadata: { taskId: task._id, title: task.title, executionStatus: task.executionStatus },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      sendSuccess(res, task, 'Task started successfully');
    } catch (error) {
      console.error('❌ [startTask] Error:', error.message);
      sendError(res, error.message, 400);
    }
  },

  /**
   * POST /tasks/:id/pause
   * Pause a task with reason
   */
  async pauseTask(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      console.log(`⏸️  [pauseTask] Pausing task ${id} by user ${userId}`);

      const task = await taskExecutionService.pauseTask(id, userId, reason);

      // Emit socket event
      notifyTaskStatusChanged(task, userId).catch(() => {});

      // Log activity
      createActivityLog({
        actorId: userId,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_EXECUTION_PAUSE',
        module: 'TASK',
        description: `Paused task "${task.title}": ${reason}`,
        metadata: { taskId: task._id, title: task.title, reason },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      sendSuccess(res, task, 'Task paused successfully');
    } catch (error) {
      console.error('❌ [pauseTask] Error:', error.message);
      sendError(res, error.message, 400);
    }
  },

  /**
   * POST /tasks/:id/resume
   * Resume a paused task
   */
  async resumeTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      console.log(`▶️  [resumeTask] Resuming task ${id} by user ${userId}`);

      const task = await taskExecutionService.resumeTask(id, userId);

      // Emit socket event
      notifyTaskStatusChanged(task, userId).catch(() => {});

      // Log activity
      createActivityLog({
        actorId: userId,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_EXECUTION_RESUME',
        module: 'TASK',
        description: `Resumed task "${task.title}"`,
        metadata: { taskId: task._id, title: task.title, executionStatus: task.executionStatus },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      sendSuccess(res, task, 'Task resumed successfully');
    } catch (error) {
      console.error('❌ [resumeTask] Error:', error.message);
      sendError(res, error.message, 400);
    }
  },

  /**
   * POST /tasks/:id/complete
   * Complete a task with mandatory completion remark
   */
  async completeTask(req, res) {
    try {
      const { id } = req.params;
      const { completionRemark } = req.body;
      const userId = req.user.id;

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

      console.log(`✅ [completeTask] Completing task ${id} by user ${userId}`);

      const task = await taskExecutionService.completeTask(id, userId, trimmedRemark);

      // Emit socket event
      notifyTaskStatusChanged(task, userId).catch(() => {});

      // Log activity
      createActivityLog({
        actorId: userId,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_EXECUTION_COMPLETE',
        module: 'TASK',
        description: `Completed task "${task.title}" - ${task.executionStatus}`,
        metadata: { taskId: task._id, title: task.title, executionStatus: task.executionStatus, hasRemark: !!trimmedRemark },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      sendSuccess(res, task, 'Task completed successfully');
    } catch (error) {
      console.error('❌ [completeTask] Error:', error.message);
      sendError(res, error.message, 400);
    }
  },

  /**
   * POST /tasks/:id/block
   * Block a task with reason
   */
  async blockTask(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      if (!reason || reason.trim().length === 0) {
        return sendError(res, 'Blocker reason is required', 400);
      }

      console.log(`🚫 [blockTask] Blocking task ${id} by user ${userId}`);

      const task = await taskExecutionService.blockTask(id, userId, reason);

      // Emit socket event
      notifyTaskStatusChanged(task, userId).catch(() => {});

      // Log activity
      createActivityLog({
        actorId: userId,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_EXECUTION_BLOCK',
        module: 'TASK',
        description: `Blocked task "${task.title}": ${reason}`,
        metadata: { taskId: task._id, title: task.title, reason },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      sendSuccess(res, task, 'Task blocked successfully');
    } catch (error) {
      console.error('❌ [blockTask] Error:', error.message);
      sendError(res, error.message, 400);
    }
  },

  /**
   * POST /tasks/:id/unblock/:blockerId
   * Resolve a blocker and resume task
   */
  async unblockTask(req, res) {
    try {
      const { id, blockerId } = req.params;
      const userId = req.user.id;

      console.log(`🔓 [unblockTask] Unblocking task ${id}, blocker ${blockerId} by user ${userId}`);

      const task = await taskExecutionService.unblockTask(id, blockerId, userId);

      // Emit socket event
      notifyTaskStatusChanged(task, userId).catch(() => {});

      // Log activity
      createActivityLog({
        actorId: userId,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_EXECUTION_UNBLOCK',
        module: 'TASK',
        description: `Resolved blocker on task "${task.title}"`,
        metadata: { taskId: task._id, title: task.title, blockerId },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      sendSuccess(res, task, 'Task unblocked successfully');
    } catch (error) {
      console.error('❌ [unblockTask] Error:', error.message);
      sendError(res, error.message, 400);
    }
  },

  /**
   * POST /tasks/:id/send-for-review
   * Send task for review
   */
  async sendForReview(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      console.log(`👀 [sendForReview] Sending task ${id} for review by user ${userId}`);

      const task = await taskExecutionService.sendForReview(id, userId);

      // Emit socket event
      notifyTaskStatusChanged(task, userId).catch(() => {});

      // Log activity
      createActivityLog({
        actorId: userId,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_EXECUTION_REVIEW',
        module: 'TASK',
        description: `Sent task "${task.title}" for review`,
        metadata: { taskId: task._id, title: task.title, executionStatus: task.executionStatus },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      sendSuccess(res, task, 'Task sent for review');
    } catch (error) {
      console.error('❌ [sendForReview] Error:', error.message);
      sendError(res, error.message, 400);
    }
  },

  /**
   * POST /tasks/:id/reopen
   * Reopen a completed task
   */
  async reopenTask(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      console.log(`🔄 [reopenTask] Reopening task ${id} by user ${userId}`);

      const task = await taskExecutionService.reopenTask(id, userId, reason);

      // Emit socket event
      notifyTaskStatusChanged(task, userId).catch(() => {});

      // Log activity
      createActivityLog({
        actorId: userId,
        actorName: req.user.name || 'Unknown',
        actorRole: req.user.role,
        actionType: 'TASK_EXECUTION_REOPEN',
        module: 'TASK',
        description: `Reopened task "${task.title}"${reason ? ': ' + reason : ''}`,
        metadata: { taskId: task._id, title: task.title, reason },
        ipAddress: req.ip,
        visibility: 'PUBLIC',
      }).catch(() => {});

      sendSuccess(res, task, 'Task reopened successfully');
    } catch (error) {
      console.error('❌ [reopenTask] Error:', error.message);
      sendError(res, error.message, 400);
    }
  },

  /**
   * GET /tasks/:id/execution-details
   * Get detailed execution tracking information
   */
  async getExecutionDetails(req, res) {
    try {
      const { id } = req.params;

      const task = await Task.findById(id)
        .select(
          'title executionStatus dueHealth startedAt completedAt lastActivityAt ' +
          'estimatedMinutes totalActiveMinutes totalPausedMinutes totalIdleMinutes ' +
          'sessions pauses blockers activityLog dueDate createdAt priority'
        )
        .populate('assignedTo', 'name email avatar')
        .populate('sessions.startedAt sessions.endedAt')
        .populate('pauses.pausedAt pauses.resumedAt')
        .populate('blockers.blockedAt blockers.unblockedAt blockers.unblocker')
        .populate('activityLog.user', 'name email avatar');

      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      // Calculate detailed metrics
      const { getTaskAnalytics } = await import('./taskExecution.utils.js');
      const analytics = getTaskAnalytics(task);

      sendSuccess(res, { task, analytics }, 'Execution details retrieved successfully');
    } catch (error) {
      console.error('❌ [getExecutionDetails] Error:', error.message);
      sendError(res, error.message, 400);
    }
  }
};
