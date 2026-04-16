/**
 * Task Execution Service
 * Handles all task execution actions: start, pause, resume, complete, block, send for review, reopen
 */

import mongoose from 'mongoose';
import { Task } from './Task.model.js';
import {
  startWorkSession,
  endWorkSession,
  addPause,
  resumeFromPause,
  addBlocker,
  resolveBlocker,
  addActivityLogEntry,
  getDueHealth,
  calculateActiveMinutes,
  calculatePausedMinutes
} from './taskExecution.utils.js';

export const taskExecutionService = {
  /**
   * Start a task
   * - Changes executionStatus to 'in_progress'
   * - Sets startedAt timestamp
   * - Creates first work session
   * - Adds activity log entry
   */
  async startTask(taskId, userId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) throw new Error('Task not found');

      const user = { _id: userId, name: 'User' }; // Get actual user if needed

      // Can only start from not_started or reopened state
      if (!['not_started', 'reopened'].includes(task.executionStatus)) {
        throw new Error(`Cannot start task in ${task.executionStatus} state`);
      }

      const now = new Date();

      // Set start info
      if (!task.startedAt) {
        task.startedAt = now;
      }

      task.executionStatus = 'in_progress';
      task.lastActivityAt = now;

      // Start first work session
      startWorkSession(task, now);

      // Add activity log
      addActivityLogEntry(task, 'started', user, {
        message: 'Task started by assignee'
      });

      // Update due health
      task.dueHealth = getDueHealth(task);

      await task.save();
      return task;
    } catch (error) {
      console.error('❌ Error starting task:', error.message);
      throw error;
    }
  },

  /**
   * Pause a task
   * - Changes executionStatus to 'paused'
   * - Ends active work session
   * - Creates pause entry with reason
   * - Adds activity log entry
   */
  async pauseTask(taskId, userId, reason = 'No reason provided') {
    try {
      const task = await Task.findById(taskId);
      if (!task) throw new Error('Task not found');

      const user = { _id: userId, name: 'User' };

      // Can only pause from in_progress state
      if (task.executionStatus !== 'in_progress') {
        throw new Error(`Cannot pause task in ${task.executionStatus} state`);
      }

      const now = new Date();

      // End active work session
      endWorkSession(task, now);

      // Add pause entry
      task.executionStatus = 'paused';
      addPause(task, reason, now);

      // Add activity log
      addActivityLogEntry(task, 'paused', user, {
        reason,
        message: `Task paused: ${reason}`
      });

      await task.save();
      return task;
    } catch (error) {
      console.error('❌ Error pausing task:', error.message);
      throw error;
    }
  },

  /**
   * Resume a paused task
   * - Changes executionStatus to 'in_progress'
   * - Closes last pause entry
   * - Creates new work session
   * - Adds activity log entry
   */
  async resumeTask(taskId, userId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) throw new Error('Task not found');

      const user = { _id: userId, name: 'User' };

      // Can only resume from paused state
      if (task.executionStatus !== 'paused') {
        throw new Error(`Cannot resume task in ${task.executionStatus} state`);
      }

      const now = new Date();

      // Resume from last pause
      resumeFromPause(task, now);

      // Start new work session
      task.executionStatus = 'in_progress';
      startWorkSession(task, now);

      // Add activity log
      addActivityLogEntry(task, 'resumed', user, {
        message: 'Task resumed by assignee'
      });

      // Update due health
      task.dueHealth = getDueHealth(task);

      await task.save();
      return task;
    } catch (error) {
      console.error('❌ Error resuming task:', error.message);
      throw error;
    }
  },

  /**
   * Complete a task
   * - Changes executionStatus to 'completed' or 'completed_late'
   * - Ends active work session
   * - Sets completedAt timestamp
   * - Calculates final metrics
   * - Adds activity log entry
   */
  async completeTask(taskId, userId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) throw new Error('Task not found');

      const user = { _id: userId, name: 'User' };

      // Can't complete if blocked
      if (task.executionStatus === 'blocked') {
        throw new Error('Cannot complete a blocked task. Resolve all blockers first.');
      }

      const now = new Date();

      // End active work session if running
      if (task.sessions && task.sessions.some(s => s.isActive)) {
        endWorkSession(task, now);
      }

      // Set completion time
      task.completedAt = now;

      // Determine if completed on time or late
      const isLate = now > new Date(task.dueDate);
      task.executionStatus = isLate ? 'completed_late' : 'completed';
      task.dueHealth = isLate ? 'completed_late' : 'completed_on_time';
      task.lastActivityAt = now;

      // Recalculate totals
      task.totalActiveMinutes = calculateActiveMinutes(task.sessions);
      task.totalPausedMinutes = calculatePausedMinutes(task.pauses);

      // Add activity log
      addActivityLogEntry(task, 'completed', user, {
        isLate,
        message: isLate ? 'Task completed late' : 'Task completed on time'
      });

      await task.save();
      return task;
    } catch (error) {
      console.error('❌ Error completing task:', error.message);
      throw error;
    }
  },

  /**
   * Block a task with reason
   * - Changes executionStatus to 'blocked'
   * - Creates blocker entry
   * - Ends active work session
   * - Adds activity log entry
   */
  async blockTask(taskId, userId, reason) {
    try {
      if (!reason || reason.trim().length === 0) {
        throw new Error('Blocker reason is required');
      }

      const task = await Task.findById(taskId);
      if (!task) throw new Error('Task not found');

      const user = { _id: userId, name: 'User' };

      // Can't block completed tasks
      if (task.executionStatus === 'completed') {
        throw new Error('Cannot block a completed task');
      }

      const now = new Date();

      // End active work session if running
      if (task.sessions && task.sessions.some(s => s.isActive)) {
        endWorkSession(task, now);
      }

      // Add blocker
      task.executionStatus = 'blocked';
      addBlocker(task, reason, now);

      // Add activity log
      addActivityLogEntry(task, 'blocked', user, {
        reason,
        message: `Task blocked: ${reason}`
      });

      await task.save();
      return task;
    } catch (error) {
      console.error('❌ Error blocking task:', error.message);
      throw error;
    }
  },

  /**
   * Unblock a task (resolve a blocker)
   * - Resolves the specified blocker
   * - Changes executionStatus back to 'in_progress' if all blockers resolved
   * - Adds activity log entry
   */
  async unblockTask(taskId, blockerId, userId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) throw new Error('Task not found');

      const user = { _id: userId, name: 'User' };

      // Resolve the blocker
      const blocker = resolveBlocker(task, blockerId, user);
      if (!blocker) {
        throw new Error('Blocker not found');
      }

      // Check if there are other active blockers
      const hasActiveBlockers = task.blockers.some(b => b.status === 'active');

      if (!hasActiveBlockers) {
        // Resume to in_progress if all blockers resolved
        task.executionStatus = 'in_progress';

        // Start new work session
        const now = new Date();
        startWorkSession(task, now);
      }

      // Add activity log
      const now = new Date();
      addActivityLogEntry(task, 'unblocked', user, {
        message: `Blocker resolved: ${blocker.reason}`
      });

      await task.save();
      return task;
    } catch (error) {
      console.error('❌ Error unblocking task:', error.message);
      throw error;
    }
  },

  /**
   * Send task for review
   * - Changes executionStatus to 'waiting_review'
   * - Ends active work session
   * - Adds activity log entry
   */
  async sendForReview(taskId, userId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) throw new Error('Task not found');

      const user = { _id: userId, name: 'User' };

      // Can't send completed or blocked tasks for review
      if (['completed', 'completed_late', 'blocked'].includes(task.executionStatus)) {
        throw new Error(`Cannot send ${task.executionStatus} task for review`);
      }

      const now = new Date();

      // End active work session if running
      if (task.sessions && task.sessions.some(s => s.isActive)) {
        endWorkSession(task, now);
      }

      task.executionStatus = 'waiting_review';
      task.lastActivityAt = now;

      // Add activity log
      addActivityLogEntry(task, 'sent_for_review', user, {
        message: 'Task sent for review'
      });

      await task.save();
      return task;
    } catch (error) {
      console.error('❌ Error sending task for review:', error.message);
      throw error;
    }
  },

  /**
   * Reopen a completed or rejected task
   * - Changes executionStatus to 'reopened'
   * - Starts new work session
   * - Adds activity log entry
   */
  async reopenTask(taskId, userId, reason = '') {
    try {
      const task = await Task.findById(taskId);
      if (!task) throw new Error('Task not found');

      const user = { _id: userId, name: 'User' };

      // Can only reopen completed or rejected tasks
      if (!['completed', 'completed_late'].includes(task.executionStatus)) {
        throw new Error(`Cannot reopen ${task.executionStatus} task`);
      }

      const now = new Date();

      task.executionStatus = 'reopened';
      task.lastActivityAt = now;

      // Start new work session
      startWorkSession(task, now);

      // Update due health
      task.dueHealth = getDueHealth(task);

      // Add activity log
      addActivityLogEntry(task, 'reopened', user, {
        reason,
        message: reason ? `Task reopened: ${reason}` : 'Task reopened'
      });

      await task.save();
      return task;
    } catch (error) {
      console.error('❌ Error reopening task:', error.message);
      throw error;
    }
  },

  /**
   * Update task execution status manually
   * Used by managers to force status changes
   */
  async updateExecutionStatus(taskId, newStatus, userId, reason = '') {
    try {
      const task = await Task.findById(taskId);
      if (!task) throw new Error('Task not found');

      const validStatuses = ['not_started', 'in_progress', 'paused', 'blocked', 'waiting_review', 'completed', 'completed_late', 'reopened'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid execution status: ${newStatus}`);
      }

      const user = { _id: userId, name: 'User' };
      const oldStatus = task.executionStatus;

      task.executionStatus = newStatus;
      task.lastActivityAt = new Date();

      // Update due health
      task.dueHealth = getDueHealth(task);

      // Add activity log
      addActivityLogEntry(task, 'status_changed', user, {
        oldValue: oldStatus,
        newValue: newStatus,
        reason,
        message: `Status changed from ${oldStatus} to ${newStatus}`
      });

      await task.save();
      return task;
    } catch (error) {
      console.error('❌ Error updating execution status:', error.message);
      throw error;
    }
  }
};
