import ExtensionRequest from './ExtensionRequest.model.js';
import { Task } from './Task.model.js';
import { sendSuccess, sendError } from '../../utils/responseHelpers.js';

export const extensionController = {
  // Request extension
  async requestExtension(req, res) {
    try {
      const { taskId, additionalHours, additionalMinutes, reason } = req.body;

      if (!taskId || !reason?.trim()) {
        return sendError(res, 'Task ID and reason are required', 400);
      }

      const task = await Task.findById(taskId).populate('assignedTo');
      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      // Check if user is assigned to this task
      const isAssignedUser = task.assignedTo?.some(u => u._id.toString() === req.user.id);
      if (!isAssignedUser) {
        return sendError(res, 'You are not assigned to this task', 403);
      }

      // Get the person who assigned this task
      const assignedByUser = await Task.findById(taskId).populate('assignedBy', '_id');
      if (!assignedByUser?.assignedBy) {
        return sendError(res, 'Assigned by user not found', 404);
      }

      // Check if extension already pending
      const existingPending = await ExtensionRequest.findOne({
        taskId,
        status: 'pending'
      });

      if (existingPending) {
        return sendError(res, 'An extension request is already pending for this task', 400);
      }

      const additionalTotalMinutes = (additionalHours || 0) * 60 + (additionalMinutes || 0);

      const extensionRequest = new ExtensionRequest({
        taskId,
        requestedBy: req.user.id,
        requestedFrom: assignedByUser.assignedBy._id,
        originalEstimatedMinutes: task.estimatedTotalMinutes || 0,
        additionalHoursRequested: additionalHours || 0,
        additionalMinutesRequested: additionalMinutes || 0,
        reason: reason.trim()
      });

      await extensionRequest.save();
      await extensionRequest.populate(['taskId', 'requestedBy', 'requestedFrom']);

      console.log('✅ [ExtensionController] Extension request created:', extensionRequest._id);

      sendSuccess(res, extensionRequest, 'Extension request submitted successfully', 201);
    } catch (error) {
      console.error('❌ [ExtensionController] Error requesting extension:', error.message);
      sendError(res, error.message, 500);
    }
  },

  // Approve extension
  async approveExtension(req, res) {
    try {
      const { extensionId } = req.params;
      const { approvalNotes } = req.body;

      const extensionRequest = await ExtensionRequest.findById(extensionId);
      if (!extensionRequest) {
        return sendError(res, 'Extension request not found', 404);
      }

      if (extensionRequest.status !== 'pending') {
        return sendError(res, `Extension request is already ${extensionRequest.status}`, 400);
      }

      // Check if user is authorized to approve
      if (extensionRequest.requestedFrom.toString() !== req.user.id) {
        return sendError(res, 'You are not authorized to approve this request', 403);
      }

      extensionRequest.status = 'approved';
      extensionRequest.approvalNotes = approvalNotes?.trim() || '';
      extensionRequest.approvedBy = req.user.id;
      extensionRequest.approvedAt = new Date();

      await extensionRequest.save();
      await extensionRequest.populate(['taskId', 'requestedBy', 'requestedFrom', 'approvedBy']);

      // Update task with extended time
      const task = await Task.findById(extensionRequest.taskId);
      if (task) {
        const additionalMinutes = extensionRequest.additionalHoursRequested * 60 + extensionRequest.additionalMinutesRequested;
        task.estimatedTotalMinutes = (task.estimatedTotalMinutes || 0) + additionalMinutes;
        task.estimatedHours = Math.floor(task.estimatedTotalMinutes / 60);
        task.estimatedMinutes = task.estimatedTotalMinutes % 60;
        await task.save();
      }

      console.log('✅ [ExtensionController] Extension approved:', extensionRequest._id);

      sendSuccess(res, extensionRequest, 'Extension request approved successfully');
    } catch (error) {
      console.error('❌ [ExtensionController] Error approving extension:', error.message);
      sendError(res, error.message, 500);
    }
  },

  // Reject extension
  async rejectExtension(req, res) {
    try {
      const { extensionId } = req.params;
      const { rejectionReason } = req.body;

      const extensionRequest = await ExtensionRequest.findById(extensionId);
      if (!extensionRequest) {
        return sendError(res, 'Extension request not found', 404);
      }

      if (extensionRequest.status !== 'pending') {
        return sendError(res, `Extension request is already ${extensionRequest.status}`, 400);
      }

      // Check if user is authorized to reject
      if (extensionRequest.requestedFrom.toString() !== req.user.id) {
        return sendError(res, 'You are not authorized to reject this request', 403);
      }

      extensionRequest.status = 'rejected';
      extensionRequest.approvalNotes = rejectionReason?.trim() || '';
      extensionRequest.rejectedAt = new Date();

      await extensionRequest.save();
      await extensionRequest.populate(['taskId', 'requestedBy', 'requestedFrom']);

      console.log('✅ [ExtensionController] Extension rejected:', extensionRequest._id);

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

      // Get requests where current user is the one who needs to approve
      // (they are the person who assigned the task)
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [requests, total] = await Promise.all([
        ExtensionRequest.find({
          requestedFrom: req.user.id,
          status: 'pending'
        })
          .populate('taskId', 'title estimatedHours estimatedMinutes assignedTo')
          .populate('requestedBy', 'name email department')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        ExtensionRequest.countDocuments({
          requestedFrom: req.user.id,
          status: 'pending'
        })
      ]);

      console.log('✅ [ExtensionController] Fetched pending approvals:', requests.length);

      sendSuccess(res, {
        requests,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
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
