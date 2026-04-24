import ExtensionRequest from './ExtensionRequest.model.js';
import { Task } from './Task.model.js';
import { sendSuccess, sendError } from '../../utils/responseHelpers.js';
import { createTaskNotification } from '../../utils/notificationHelper.js';
import { notifyTaskStatusChanged } from '../../utils/socket.js';
import { extendTaskTime, formatToIST } from './taskDeadline.utils.js';
import { formatTaskResponse } from './taskResponseFormatter.js';

export const extensionController = {
  // Request extension
  async requestExtension(req, res) {
    try {
      const { taskId, additionalHours, additionalMinutes, reason } = req.body;

      if (!taskId || !reason?.trim()) {
        return sendError(res, 'Task ID and reason are required', 400);
      }

      const task = await Task.findById(taskId).populate('assignedTo').populate('assignedBy', '_id name');
      if (!task) return sendError(res, 'Task not found', 404);

      const isAssignedUser = task.assignedTo?.some(u => u._id.toString() === req.user.id);
      if (!isAssignedUser) return sendError(res, 'You are not assigned to this task', 403);

      // Check if task is completed - completed tasks cannot request extension
      if (task.status === 'completed') {
        return sendError(res, 'Completed tasks cannot request extension', 400);
      }

      // Check if task is self-assigned - self-assigned tasks CANNOT request extension
      const isSelfAssigned = task.assignedBy?._id.toString() === req.user.id ||
        task.assignedBy?.toString() === req.user.id;
      if (isSelfAssigned) {
        return sendError(res, 'Self-assigned tasks cannot request extension. Please contact your manager if you need more time.', 403);
      }

      const existingPending = await ExtensionRequest.findOne({ taskId, status: 'pending' });
      if (existingPending) return sendError(res, 'An extension request is already pending for this task', 400);

      const additionalTotalMinutes = (additionalHours || 0) * 60 + (additionalMinutes || 0);
      if (additionalTotalMinutes <= 0) return sendError(res, 'Additional time must be greater than 0', 400);

      const extensionRequest = new ExtensionRequest({
        taskId,
        requestedBy: req.user.id,
        requestedFrom: task.assignedBy._id,
        originalEstimatedMinutes: task.estimatedTotalMinutes || 0,
        additionalHoursRequested: additionalHours || 0,
        additionalMinutesRequested: additionalMinutes || 0,
        reason: reason.trim()
      });

      await extensionRequest.save();

      // Update task status to extension_requested
      task.status = 'extension_requested';
      task.approvalStatus = 'pending';
      await task.save();

      await extensionRequest.populate(['taskId', 'requestedBy', 'requestedFrom']);

      // Notify only the assigner (not HR/Admin)
      await createTaskNotification({
        userId: task.assignedBy._id,
        taskId: task._id,
        eventType: 'system',
        title: '⏳ Extension Request',
        message: `${req.user.name || 'Employee'} requested +${additionalTotalMinutes} min for "${task.title}". Reason: ${reason.trim()}`,
        triggeredBy: req.user.id
      }).catch(() => {});

      notifyTaskStatusChanged(task, req.user.id).catch(() => {});

      sendSuccess(res, extensionRequest, 'Extension request submitted successfully', 201);
    } catch (error) {
      console.error('❌ [ExtensionController] Error requesting extension:', error.message);
      sendError(res, error.message, 500);
    }
  },

  // Approve extension — extends dueDate, notifies employee
  async approveExtension(req, res) {
    try {
      const { extensionId } = req.params;
      const { approvalNotes } = req.body;

      const extensionRequest = await ExtensionRequest.findById(extensionId)
        .populate('taskId')
        .populate('requestedBy', '_id name email');
      if (!extensionRequest) return sendError(res, 'Extension request not found', 404);
      if (extensionRequest.status !== 'pending') return sendError(res, `Extension request is already ${extensionRequest.status}`, 400);
      if (extensionRequest.requestedFrom.toString() !== req.user.id) {
        return sendError(res, 'You are not authorized to approve this request', 403);
      }

      extensionRequest.status = 'approved';
      extensionRequest.approvalNotes = approvalNotes?.trim() || '';
      extensionRequest.approvedBy = req.user.id;
      extensionRequest.approvedAt = new Date();
      await extensionRequest.save();

      // Update task: extend time + reset status to in-progress
      const task = await Task.findById(extensionRequest.taskId._id || extensionRequest.taskId);
      if (task) {
        const additionalMinutes = extensionRequest.additionalHoursRequested * 60 + extensionRequest.additionalMinutesRequested;
        task.estimatedTotalMinutes = (task.estimatedTotalMinutes || 0) + additionalMinutes;
        task.estimatedHours = Math.floor(task.estimatedTotalMinutes / 60);
        task.estimatedMinutes = task.estimatedTotalMinutes % 60;
        // Extend dueDate
        const currentDue = new Date(task.dueDate);
        task.dueDate = new Date(currentDue.getTime() + additionalMinutes * 60000);
        if (task.dueAt) task.dueAt = new Date(new Date(task.dueAt).getTime() + additionalMinutes * 60000);
        task.status = task.startedAt ? 'in-progress' : 'pending';
        task.approvalStatus = 'approved';
        task.taskExtended = true;
        task.extendedTimeMinutes = (task.extendedTimeMinutes || 0) + additionalMinutes;
        await task.save();
        await task.populate([{ path: 'assignedTo', select: 'name email' }, { path: 'assignedBy', select: 'name email' }]);
        notifyTaskStatusChanged(task, req.user.id).catch(() => {});
      }

      // Notify the employee who requested
      await createTaskNotification({
        userId: extensionRequest.requestedBy._id,
        taskId: extensionRequest.taskId._id || extensionRequest.taskId,
        eventType: 'system',
        title: `✅ Extension Approved: ${extensionRequest.taskId.title || 'Task'}`,
        message: `Your extension request for "${extensionRequest.taskId.title || 'Task'}" has been approved. +${extensionRequest.additionalHoursRequested}h ${extensionRequest.additionalMinutesRequested}m added. New due date extended.${approvalNotes ? ' Note: ' + approvalNotes : ''}`,
        triggeredBy: req.user.id
      }).catch(() => {});

      sendSuccess(res, extensionRequest, 'Extension request approved successfully');
    } catch (error) {
      console.error('❌ [ExtensionController] Error approving extension:', error.message);
      sendError(res, error.message, 500);
    }
  },

  // Reject extension — notifies employee, task goes back to overdue
  async rejectExtension(req, res) {
    try {
      const { extensionId } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason?.trim()) return sendError(res, 'Rejection reason is required', 400);

      const extensionRequest = await ExtensionRequest.findById(extensionId)
        .populate('taskId')
        .populate('requestedBy', '_id name email');
      if (!extensionRequest) return sendError(res, 'Extension request not found', 404);
      if (extensionRequest.status !== 'pending') return sendError(res, `Extension request is already ${extensionRequest.status}`, 400);
      if (extensionRequest.requestedFrom.toString() !== req.user.id) {
        return sendError(res, 'You are not authorized to reject this request', 403);
      }

      extensionRequest.status = 'rejected';
      extensionRequest.approvalNotes = rejectionReason.trim();
      extensionRequest.rejectedAt = new Date();
      await extensionRequest.save();

      // Reset task status back to overdue
      const task = await Task.findById(extensionRequest.taskId._id || extensionRequest.taskId);
      if (task) {
        task.status = 'overdue';
        task.approvalStatus = 'rejected';
        await task.save();
        await task.populate([{ path: 'assignedTo', select: 'name email' }, { path: 'assignedBy', select: 'name email' }]);
        notifyTaskStatusChanged(task, req.user.id).catch(() => {});
      }

      // Notify the employee
      await createTaskNotification({
        userId: extensionRequest.requestedBy._id,
        taskId: extensionRequest.taskId._id || extensionRequest.taskId,
        eventType: 'system',
        title: `❌ Extension Rejected: ${extensionRequest.taskId.title || 'Task'}`,
        message: `Your extension request for "${extensionRequest.taskId.title || 'Task'}" has been rejected. Reason: ${rejectionReason.trim()}. Please complete the task immediately.`,
        triggeredBy: req.user.id
      }).catch(() => {});

      sendSuccess(res, extensionRequest, 'Extension request rejected');
    } catch (error) {
      console.error('❌ [ExtensionController] Error rejecting extension:', error.message);
      sendError(res, error.message, 500);
    }
  },

  // Get pending extension requests for current user to approve/reject
  async getPendingForApproval(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const role = (req.user.role || '').toUpperCase();
      const isHROrAdmin = role === 'HR' || role === 'ADMIN';

      // HR/Admin also see self-assigned task extension requests
      // A self-assigned task is where requestedBy === requestedFrom
      const query = isHROrAdmin
        ? {
            status: 'pending',
            $or: [
              { requestedFrom: req.user.id },
              { $expr: { $eq: ['$requestedBy', '$requestedFrom'] } }
            ]
          }
        : { requestedFrom: req.user.id, status: 'pending' };

      const [requests, total] = await Promise.all([
        ExtensionRequest.find(query)
          .populate('taskId', 'title estimatedHours estimatedMinutes assignedTo')
          .populate('requestedBy', 'name email department')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        ExtensionRequest.countDocuments(query)
      ]);

      sendSuccess(res, {
        requests,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
      }, 'Pending extension requests fetched successfully');
    } catch (error) {
      console.error('❌ [ExtensionController] Error fetching pending approvals:', error.message);
      sendError(res, error.message, 500);
    }
  },

  // Get all extension requests (viewing only - HR/Admin can see all for reporting)
  async getAllExtensionRequests(req, res) {
    try {
      const { status, userId, taskId, page = 1, limit = 20 } = req.query;

      let query = {};
      if (status) query.status = status;
      if (userId) query.requestedBy = userId;
      if (taskId) query.taskId = taskId;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [requests, total] = await Promise.all([
        ExtensionRequest.find(query)
          .populate('taskId', 'title estimatedHours estimatedMinutes')
          .populate('requestedBy', 'name email')
          .populate('requestedFrom', 'name email')
          .populate('approvedBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        ExtensionRequest.countDocuments(query)
      ]);

      console.log('✅ [ExtensionController] Fetched all extension requests:', requests.length);

      sendSuccess(res, {
        requests,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }, 'Extension requests fetched successfully');
    } catch (error) {
      console.error('❌ [ExtensionController] Error fetching extension requests:', error.message);
      sendError(res, error.message, 500);
    }
  },

  // Get pending extension requests for current user
  async getMyExtensionRequests(req, res) {
    try {
      const { status, page = 1, limit = 10 } = req.query;

      let query = {
        $or: [
          { requestedBy: req.user.id },
          { requestedFrom: req.user.id }
        ]
      };

      if (status) query.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [requests, total] = await Promise.all([
        ExtensionRequest.find(query)
          .populate('taskId', 'title estimatedHours estimatedMinutes assignedTo')
          .populate('requestedBy', 'name email')
          .populate('requestedFrom', 'name email')
          .populate('approvedBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        ExtensionRequest.countDocuments(query)
      ]);

      console.log('✅ [ExtensionController] Fetched my extension requests:', requests.length);

      sendSuccess(res, {
        requests,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }, 'Extension requests fetched successfully');
    } catch (error) {
      console.error('❌ [ExtensionController] Error fetching my extension requests:', error.message);
      sendError(res, error.message, 500);
    }
  }
};
