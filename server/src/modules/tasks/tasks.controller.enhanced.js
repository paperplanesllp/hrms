import mongoose from 'mongoose';
import Task from './Task.model.js';
import TaskHistory from './TaskHistory.model.js';
import EmployeeProductivity from './EmployeeProductivity.model.js';
import { sendSuccess, sendError } from '../../utils/responseHelpers.js';
import {
  notifyTaskCreated,
  notifyTaskUpdated,
  notifyTaskStatusChanged,
  notifyTaskDeleted,
  notifyTaskForwarded,
  notifyTaskReassigned
} from '../../utils/socket.js';
import { sendNotification } from '../../utils/notifications.js';

/**
 * Helper function to record task history
 */
async function recordTaskHistory(taskId, action, data = {}) {
  try {
    const history = new TaskHistory({
      taskId,
      performedBy: data.performedBy,
      action,
      oldValue: data.oldValue || null,
      newValue: data.newValue || null,
      details: data.details || '',
      fromUser: data.fromUser || null,
      toUser: data.toUser || null
    });
    await history.save();
    return history;
  } catch (error) {
    console.error('Error recording task history:', error);
  }
}

/**
 * Update employee productivity metrics
 */
async function updateProductivity(userId) {
  try {
    const tasks = await Task.find({ assignedTo: userId, isDeleted: false });
    
    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      pendingTasks: tasks.filter(t => t.status === 'pending' || t.status === 'new').length,
      inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
      onHoldTasks: tasks.filter(t => t.status === 'on-hold').length,
      overdueTasks: tasks.filter(t => t.status === 'overdue' || (t.status !== 'completed' && new Date() > t.dueDate)).length
    };

    const completionRate = stats.totalTasks === 0 ? 0 : Math.round((stats.completedTasks / stats.totalTasks) * 100);
    const onTimeCompletions = tasks.filter(t => t.completedOnTime === true).length;
    const onTimeRate = stats.completedTasks === 0 ? 0 : Math.round((onTimeCompletions / stats.completedTasks) * 100);

    let productivity = await EmployeeProductivity.findOne({ employeeId: userId });

    if (productivity) {
      productivity.totalTasks = stats.totalTasks;
      productivity.completedTasks = stats.completedTasks;
      productivity.pendingTasks = stats.pendingTasks;
      productivity.inProgressTasks = stats.inProgressTasks;
      productivity.onHoldTasks = stats.onHoldTasks;
      productivity.overdueTasks = stats.overdueTasks;
      productivity.completionRate = completionRate;
      productivity.onTimeCompletionRate = onTimeRate;
      productivity.assignedTasksCount = stats.totalTasks;
      productivity.currentWorkload = productivity.determineWorkload();
      productivity.productivityScore = productivity.calculateScore();
      productivity.lastCalculatedAt = new Date();
      
      await productivity.save();
    } else {
      productivity = new EmployeeProductivity({
        employeeId: userId,
        ...stats,
        completionRate,
        onTimeCompletionRate: onTimeRate,
        assignedTasksCount: stats.totalTasks,
        productivityScore: 0,
        lastCalculatedAt: new Date()
      });
      await productivity.save();
    }

    return productivity;
  } catch (error) {
    console.error('Error updating productivity:', error);
  }
}

export const tasksControllerEnhanced = {
  /**
   * Forward Task to Another Employee
   */
  async forwardTask(req, res) {
    try {
      const { id } = req.params;
      const { toUserId, message } = req.body;
      const userId = req.user.id;

      if (!toUserId) {
        return sendError(res, 'Target user ID is required', 400);
      }

      const task = await Task.findById(id);
      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      // Record history
      await recordTaskHistory(id, 'forwarded', {
        performedBy: userId,
        fromUser: task.assignedTo,
        toUser: toUserId,
        details: message || 'Task forwarded'
      });

      // Update task
      task.forwardedFrom = task.assignedTo;
      task.forwardedAt = new Date();
      task.assignedTo = toUserId;
      await task.save();

      // Get the forwarded-to user for notification
      const recipientUser = await User.findById(toUserId);

      // Send notification
      await sendNotification(toUserId, {
        type: 'task_forwarded',
        title: 'Task Forwarded',
        message: `Task "${task.title}" has been forwarded to you`,
        taskId: id,
        relatedUserId: userId
      });

      // Emit socket notification
      notifyTaskForwarded(task, userId, toUserId);

      // Update productivity for both users
      await updateProductivity(task.assignedTo);
      await updateProductivity(toUserId);

      sendSuccess(res, task, 'Task forwarded successfully');
    } catch (error) {
      console.error('Error forwarding task:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * Reassign Task to Another Employee
   */
  async reassignTask(req, res) {
    try {
      const { id } = req.params;
      const { toUserId, reason } = req.body;
      const userId = req.user.id;

      if (!toUserId) {
        return sendError(res, 'Target user ID is required', 400);
      }

      const task = await Task.findById(id);
      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      // Record history
      await recordTaskHistory(id, 'reassigned', {
        performedBy: userId,
        oldValue: task.assignedTo.toString(),
        newValue: toUserId,
        fromUser: task.assignedTo,
        toUser: toUserId,
        details: reason || 'Task reassigned'
      });

      const previousAssignee = task.assignedTo;

      // Update task
      task.reassignedFrom = previousAssignee;
      task.reassignedAt = new Date();
      task.assignedTo = toUserId;
      task.status = 'new'; // Reset to new status
      task.progress = 0; // Reset progress
      await task.save();

      // Send notifications
      await sendNotification(toUserId, {
        type: 'task_reassigned',
        title: 'Task Reassigned',
        message: `Task "${task.title}" has been reassigned to you. Reason: ${reason || 'N/A'}`,
        taskId: id,
        relatedUserId: userId
      });

      // Emit socket notification
      notifyTaskReassigned(task, userId, previousAssignee, toUserId);

      // Update productivity for all involved
      await updateProductivity(previousAssignee);
      await updateProductivity(toUserId);

      sendSuccess(res, task, 'Task reassigned successfully');
    } catch (error) {
      console.error('Error reassigning task:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * Put Task on Hold
   */
  async holdTask(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const task = await Task.findById(id);
      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      // Record history
      await recordTaskHistory(id, 'on_hold', {
        performedBy: userId,
        oldValue: task.status,
        newValue: 'on-hold',
        details: reason || 'Task put on hold'
      });

      // Update task
      const previousStatus = task.status;
      task.status = 'on-hold';
      await task.save();

      // Send notification to assignee
      await sendNotification(task.assignedTo, {
        type: 'task_on_hold',
        title: 'Task Put On Hold',
        message: `Task "${task.title}" has been put on hold. Reason: ${reason || 'N/A'}`,
        taskId: id,
        relatedUserId: userId
      });

      // Emit socket notification
      notifyTaskStatusChanged(task);

      // Update productivity
      await updateProductivity(task.assignedTo);

      sendSuccess(res, task, 'Task put on hold');
    } catch (error) {
      console.error('Error holding task:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * Complete Task
   */
  async completeTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const task = await Task.findById(id);
      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      // Record history
      await recordTaskHistory(id, 'completed', {
        performedBy: userId,
        oldValue: task.status,
        newValue: 'completed',
        details: 'Task marked as complete'
      });

      // Update task
      task.status = 'completed';
      task.completedAt = new Date();
      task.progress = 100;

      // Check if completed on time
      task.completedOnTime = task.completedAt <= task.dueDate;

      await task.save();

      // Send notification to assignedBy user
      if (task.assignedBy.toString() !== userId) {
        await sendNotification(task.assignedBy, {
          type: 'task_completed',
          title: 'Task Completed',
          message: `Task "${task.title}" has been completed by the assignee`,
          taskId: id,
          relatedUserId: userId
        });
      }

      // Emit socket notification
      notifyTaskStatusChanged(task);

      // Update productivity
      await updateProductivity(task.assignedTo);

      sendSuccess(res, task, 'Task completed successfully');
    } catch (error) {
      console.error('Error completing task:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * Update Task Progress
   */
  async updateProgress(req, res) {
    try {
      const { id } = req.params;
      const { progress } = req.body;
      const userId = req.user.id;

      if (progress === undefined || progress < 0 || progress > 100) {
        return sendError(res, 'Progress must be between 0 and 100', 400);
      }

      const task = await Task.findById(id);
      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      // Record history
      await recordTaskHistory(id, 'progress_updated', {
        performedBy: userId,
        oldValue: task.progress,
        newValue: progress,
        details: `Progress updated from ${task.progress}% to ${progress}%`
      });

      const previousProgress = task.progress;
      task.progress = progress;

      // Auto-update status based on progress
      if (progress > 0 && progress < 100 && task.status === 'new') {
        task.status = 'in-progress';
      } else if (progress === 100 && task.status !== 'completed') {
        task.status = 'completed';
        task.completedAt = new Date();
        task.completedOnTime = task.completedAt <= task.dueDate;
      }

      await task.save();

      // Emit socket notification
      notifyTaskUpdated(task);

      // Update productivity
      await updateProductivity(task.assignedTo);

      sendSuccess(res, task, 'Task progress updated');
    } catch (error) {
      console.error('Error updating progress:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * Add Comment to Task
   */
  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const userId = req.user.id;

      if (!text || text.trim().length === 0) {
        return sendError(res, 'Comment text is required', 400);
      }

      const task = await Task.findById(id);
      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      const user = await User.findById(userId);

      const comment = {
        _id: new mongoose.Types.ObjectId(),
        userId,
        username: user.name,
        text: text.trim(),
        createdAt: new Date()
      };

      task.comments.push(comment);
      await task.save();

      // Record history
      await recordTaskHistory(id, 'commented', {
        performedBy: userId,
        details: `Added comment: ${text.substring(0, 100)}...`
      });

      // Emit socket notification
      notifyTaskUpdated(task);

      sendSuccess(res, comment, 'Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * Get Task History
   */
  async getTaskHistory(req, res) {
    try {
      const { id } = req.params;

      const history = await TaskHistory.find({ taskId: id })
        .populate('performedBy', 'name email avatar')
        .populate('fromUser', 'name email avatar')
        .populate('toUser', 'name email avatar')
        .sort({ timestamp: -1 })
        .limit(100);

      sendSuccess(res, history, 'Task history retrieved');
    } catch (error) {
      console.error('Error getting task history:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * Get Employee Productivity
   */
  async getEmployeeProductivity(req, res) {
    try {
      const { userId } = req.params;

      let productivity = await EmployeeProductivity.findOne({ employeeId: userId })
        .populate('employeeId', 'name email avatar')
        .populate('department', 'name');

      if (!productivity) {
        // Calculate if doesn't exist
        productivity = await updateProductivity(userId);
      }

      sendSuccess(res, productivity, 'Employee productivity retrieved');
    } catch (error) {
      console.error('Error getting productivity:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * Get Overloaded Employees
   */
  async getOverloadedEmployees(req, res) {
    try {
      const overloaded = await EmployeeProductivity.find({
        $or: [
          { currentWorkload: 'overloaded' },
          { currentWorkload: 'heavy' }
        ]
      })
        .populate('employeeId', 'name email avatar')
        .populate('department', 'name')
        .sort({ productivityScore: 1 })
        .limit(50);

      sendSuccess(res, overloaded, 'Overloaded employees retrieved');
    } catch (error) {
      console.error('Error getting overloaded employees:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * AI Feature: Generate Tasks from Text
   */
  async generateTasksFromText(req, res) {
    try {
      const { text, departmentId } = req.body;
      const userId = req.user.id;

      // Import AI service dynamically
      const { default: aiTaskGenerator } = await import('./services/aiTaskGenerator.service.js');

      const generatedTasks = await aiTaskGenerator.generateTasksFromText(text, {
        departmentUsers: [],
        createdBy: userId,
        departmentId
      });

      // Save tasks to database
      const savedTasks = await Task.insertMany(
        generatedTasks.map((task) => ({ ...task, createdBy: userId, department: departmentId }))
      );

      // Record history for each task
      for (const task of savedTasks) {
        await recordTaskHistory(task._id, 'created', {
          performedBy: userId,
          newValue: task
        });
      }

      sendSuccess(res, savedTasks, `${savedTasks.length} tasks generated from text`, 201);
    } catch (error) {
      console.error('Error generating tasks from text:', error);
      sendError(res, error.message, 400);
    }
  },

  /**
   * AI Feature: Generate Tasks from Email
   */
  async generateTasksFromEmail(req, res) {
    try {
      const { subject = '', body = '', from = '', attachments = [] } = req.body;
      const userId = req.user.id;

      // Import services dynamically
      const { default: emailParser } = await import('./services/emailTaskParser.service.js');
      const { default: aiTaskGenerator } = await import('./services/aiTaskGenerator.service.js');

      // Validate it's a task email
      if (!emailParser.isTaskEmail(subject, body)) {
        return sendError(res, 'Email does not appear to contain actionable tasks', 400);
      }

      // Extract task from email
      const taskData = emailParser.extractTaskFromEmail({
        subject,
        body,
        from,
        attachments,
        receivedDate: new Date()
      });

      // Validate extracted task
      const validation = emailParser.validateExtractedTask(taskData);
      if (!validation.isValid) {
        return sendError(res, `Invalid email task: ${validation.errors.join(', ')}`, 400);
      }

      // Predict deadline if not detected
      if (!taskData.dueDate) {
        const prediction = await aiTaskGenerator.predictDeadline(
          taskData.title,
          req.user.department,
          taskData.assignedTo
        );
        if (prediction) {
          taskData.dueDate = prediction.deadline;
          taskData.aiMetadata.deadlinePrediction = prediction.reasoning;
        }
      }

      // Save task
      const task = new Task({
        ...taskData,
        createdBy: userId,
        department: req.user.department
      });
      await task.save();

      // Record history
      await recordTaskHistory(task._id, 'created', {
        performedBy: userId,
        newValue: task
      });

      sendSuccess(res, task, 'Task created from email', 201);
    } catch (error) {
      console.error('Error generating task from email:', error);
      sendError(res, error.message, 400);
    }
  },

  /**
   * AI Feature: Get Task Suggestions
   */
  async getTaskSuggestions(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 5 } = req.query;

      // Import suggestion service
      const { default: taskSuggestion } = await import('./services/taskSuggestion.service.js');

      const suggestions = await taskSuggestion.generateSuggestions(userId, parseInt(limit));

      sendSuccess(res, suggestions, 'Task suggestions generated');
    } catch (error) {
      console.error('Error getting task suggestions:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * AI Feature: Get Suggestions by Type
   */
  async getSuggestionsByType(req, res) {
    try {
      const { type } = req.params;
      const userId = req.user.id;

      // Import suggestion service
      const { default: taskSuggestion } = await import('./services/taskSuggestion.service.js');

      const suggestions = await taskSuggestion.getSuggestionsByType(userId, type);

      sendSuccess(res, suggestions, `${type} suggestions retrieved`);
    } catch (error) {
      console.error('Error getting suggestions by type:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * AI Feature: Accept Suggestion and Create Task
   */
  async acceptAISuggestion(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { assignedTo, departmentId, dueDate, priority } = req.body;

      // Import suggestion service
      const { default: taskSuggestion } = await import('./services/taskSuggestion.service.js');

      // For now, we'll create the task from the suggestion data
      // In production, you'd store suggestions and retrieve them here
      const suggestion = JSON.parse(req.body.suggestion || '{}');

      const taskData = await taskSuggestion.acceptSuggestion(userId, suggestion, {
        assignedTo: assignedTo || null,
        department: departmentId || req.user.department,
        dueDate: dueDate ? new Date(dueDate) : suggestion.suggestedTask.dueDate,
        priority: priority || suggestion.suggestedTask.priority
      });

      const task = new Task(taskData);
      await task.save();

      await recordTaskHistory(task._id, 'created', {
        performedBy: userId,
        newValue: task
      });

      sendSuccess(res, task, 'Task created from suggestion', 201);
    } catch (error) {
      console.error('Error accepting AI suggestion:', error);
      sendError(res, error.message, 400);
    }
  },

  /**
   * AI Feature: Predict Deadline
   */
  async predictDeadline(req, res) {
    try {
      const { title, department, assignedTo } = req.body;
      const userId = req.user.id;

      // Import AI service
      const { default: aiTaskGenerator } = await import('./services/aiTaskGenerator.service.js');

      const prediction = await aiTaskGenerator.predictDeadline(
        title,
        department || req.user.department,
        assignedTo
      );

      if (!prediction) {
        return sendError(res, 'Unable to predict deadline for this task', 400);
      }

      sendSuccess(res, prediction, 'Deadline predicted');
    } catch (error) {
      console.error('Error predicting deadline:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * AI Feature: Break Down Task into Subtasks
   */
  async breakdownTaskIntoSubtasks(req, res) {
    try {
      const { id } = req.params;
      const { maxSubtasks = 5 } = req.body;
      const userId = req.user.id;

      // Get task
      const task = await Task.findById(id);
      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      // Check authorization
      if (task.createdBy.toString() !== userId && task.assignedTo.toString() !== userId) {
        return sendError(res, 'Unauthorized to breakdown this task', 403);
      }

      // Import AI service and SubTask model
      const { default: aiTaskGenerator } = await import('./services/aiTaskGenerator.service.js');
      const { default: SubTask } = await import('./SubTask.model.js');

      // Generate subtasks
      const subtaskData = await aiTaskGenerator.breakdownTaskIntoSubtasks(task, maxSubtasks);

      if (subtaskData.length === 0) {
        return sendError(res, 'Task is too simple to break down', 400);
      }

      // Save subtasks
      const subtasks = await SubTask.insertMany(
        subtaskData.map((s) => ({ ...s, taskId: id }))
      );

      // Update task with subtask flag
      task.hasSubtasks = true;
      task.subtaskCount = subtasks.length;
      await task.save();

      sendSuccess(res, subtasks, 'Task breakdown created', 201);
    } catch (error) {
      console.error('Error breaking down task:', error);
      sendError(res, error.message, 400);
    }
  },

  /**
   * Get Subtasks for a Task
   */
  async getSubtasks(req, res) {
    try {
      const { id } = req.params;
      const { default: SubTask } = await import('./SubTask.model.js');

      const subtasks = await SubTask.find({ taskId: id })
        .populate('assignedTo', 'name email avatar')
        .sort({ order: 1 });

      sendSuccess(res, subtasks, 'Subtasks retrieved');
    } catch (error) {
      console.error('Error getting subtasks:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * Update Subtask
   */
  async updateSubtask(req, res) {
    try {
      const { id, subTaskId } = req.params;
      const { title, description, assignedTo, progress } = req.body;
      const userId = req.user.id;

      const { default: SubTask } = await import('./SubTask.model.js');

      const subtask = await SubTask.findById(subTaskId);
      if (!subtask || subtask.taskId.toString() !== id) {
        return sendError(res, 'Subtask not found', 404);
      }

      // Update fields
      if (title) subtask.title = title;
      if (description !== undefined) subtask.description = description;
      if (assignedTo) subtask.assignedTo = assignedTo;
      if (progress !== undefined) subtask.progress = Math.min(Math.max(progress, 0), 100);

      await subtask.save();

      sendSuccess(res, subtask, 'Subtask updated');
    } catch (error) {
      console.error('Error updating subtask:', error);
      sendError(res, error.message, 400);
    }
  },

  /**
   * Complete Subtask
   */
  async completeSubtask(req, res) {
    try {
      const { id, subTaskId } = req.params;
      const userId = req.user.id;

      const { default: SubTask } = await import('./SubTask.model.js');

      const subtask = await SubTask.findById(subTaskId);
      if (!subtask || subtask.taskId.toString() !== id) {
        return sendError(res, 'Subtask not found', 404);
      }

      subtask.status = 'completed';
      subtask.progress = 100;
      subtask.completedAt = new Date();
      await subtask.save();

      sendSuccess(res, subtask, 'Subtask completed');
    } catch (error) {
      console.error('Error completing subtask:', error);
      sendError(res, error.message, 400);
    }
  },

  /**
   * Delete Subtask
   */
  async deleteSubtask(req, res) {
    try {
      const { id, subTaskId } = req.params;
      const userId = req.user.id;

      const { default: SubTask } = await import('./SubTask.model.js');

      const subtask = await SubTask.findByIdAndDelete(subTaskId);
      if (!subtask) {
        return sendError(res, 'Subtask not found', 404);
      }

      // Update parent task subtask count
      const task = await Task.findById(id);
      if (task) {
        const remainingSubtasks = await SubTask.countDocuments({ taskId: id });
        task.subtaskCount = remainingSubtasks;
        if (remainingSubtasks === 0) {
          task.hasSubtasks = false;
        }
        await task.save();
      }

      sendSuccess(res, { message: 'Subtask deleted' }, 'Subtask deleted');
    } catch (error) {
      console.error('Error deleting subtask:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * Accept Task
   */
  async acceptTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const task = await Task.findById(id);
      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      // Record history
      await recordTaskHistory(id, 'accepted', {
        performedBy: userId,
        oldValue: task.status,
        newValue: 'pending',
        details: 'Task accepted by assignee'
      });

      // Update task
      const previousStatus = task.status;
      task.status = 'pending';
      await task.save();

      // Send notification to task assigner
      if (task.assignedBy.toString() !== userId) {
        await sendNotification(task.assignedBy, {
          type: 'task_accepted',
          title: 'Task Accepted',
          message: `Task "${task.title}" has been accepted by the assignee`,
          taskId: id,
          relatedUserId: userId
        });
      }

      // Emit socket notification
      notifyTaskStatusChanged(task);

      // Update productivity
      await updateProductivity(task.assignedTo);

      sendSuccess(res, task, 'Task accepted successfully');
    } catch (error) {
      console.error('Error accepting task:', error);
      sendError(res, error.message, 500);
    }
  },

  /**
   * Reject Task
   */
  async rejectTask(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const task = await Task.findById(id);
      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      // Record history
      await recordTaskHistory(id, 'rejected', {
        performedBy: userId,
        oldValue: task.status,
        newValue: 'new',
        details: reason || 'Task rejected by assignee'
      });

      // Update task
      task.status = 'new';
      task.progress = 0;
      task.rejectionReason = reason || '';
      task.rejectedBy = userId;
      task.rejectedAt = new Date();
      await task.save();

      // Send notification to task assigner
      if (task.assignedBy.toString() !== userId) {
        await sendNotification(task.assignedBy, {
          type: 'task_rejected',
          title: 'Task Rejected',
          message: `Task "${task.title}" has been rejected by the assignee. Reason: ${reason || 'Not provided'}`,
          taskId: id,
          relatedUserId: userId
        });
      }

      // Emit socket notification
      notifyTaskStatusChanged(task);

      // Update productivity
      await updateProductivity(task.assignedTo);

      sendSuccess(res, task, 'Task rejected successfully');
    } catch (error) {
      console.error('Error rejecting task:', error);
      sendError(res, error.message, 500);
    }
