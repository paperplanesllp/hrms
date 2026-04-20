import mongoose from 'mongoose';
import { Task } from './Task.model.js';
import { User } from '../users/User.model.js';
import { Department } from '../department/Department.model.js';
import { TASK_TIMING_STATE, evaluateEmployeePerformance, syncTaskTimingFields } from './taskDeadline.utils.js';
import { ROLES } from '../../middleware/roles.js';

export const tasksService = {
  // Get my tasks (assigned to current user)
  async getMyTasks(userId, filters = {}) {
    try {
      console.log('🔍 [getMyTasks] Fetching tasks for userId:', userId, 'Type:', typeof userId);
      
      // Validate userId
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      let userObjectId;
      try {
        userObjectId = new mongoose.Types.ObjectId(userId);
        console.log('✅ [getMyTasks] Converted to ObjectId:', userObjectId.toString());
      } catch (e) {
        console.error('❌ [getMyTasks] Failed to convert userId to ObjectId:', e.message);
        throw new Error(`Invalid user ID format: ${userId}`);
      }
      
      const query = { assignedTo: { $in: [userObjectId] }, isDeleted: false };
      
      // Status filter
      if (filters.status) {
        query.status = filters.status;
      }
      
      // Priority filter
      if (filters.priority) {
        query.priority = filters.priority;
      }
      
      // Date range - handle correctly without conflicts
      if (filters.from || filters.to) {
        query.dueDate = {};
        if (filters.from) {
          query.dueDate.$gte = new Date(filters.from);
        }
        if (filters.to) {
          const endDate = new Date(filters.to);
          endDate.setHours(23, 59, 59, 999);
          query.dueDate.$lte = endDate;
        }
      }
      
      // Search by title or description
      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
        ];
      }
      
      console.log('📋 [getMyTasks] Query object:', JSON.stringify(query, null, 2));
      console.log('🔎 [getMyTasks] Executing find with query...');
      
      const tasks = await Task.find(query)
        .populate('assignedTo', 'name email avatar')
        .populate('assignedBy', 'name email avatar')
        .populate('department', 'name')
        .sort({ 
          status: 1, 
          ...(filters.sort === 'dueDate' ? { dueDate: 1 } : { createdAt: -1 }),
          priority: -1 
        })
        .limit(filters.limit || 50);
      
      console.log('✅ [getMyTasks] Found', tasks.length, 'tasks');
      
      // Debug: Check if any tasks exist at all for debugging
      if (tasks.length === 0) {
        const allTasks = await Task.find({ isDeleted: false }).select('assignedTo title -_id');
        console.log('⚠️ [getMyTasks] No tasks found for this user. Total tasks in DB:', allTasks.length);
        if (allTasks.length > 0) {
          console.log('📊 [getMyTasks] Sample assignedTo values:', allTasks.slice(0, 5).map(t => ({
            assignedTo: t.assignedTo.toString(),
            title: t.title
          })));
          console.log('🔍 [getMyTasks] Comparing: Looking for:', userObjectId.toString());
        }
      }
      
      return tasks;
    } catch (error) {
      console.error('❌ [getMyTasks] Error:', error.message);
      throw error;
    }
  },

  // Get all tasks (admin/HR only)
  async getAllTasks(filters = {}) {
    const query = { isDeleted: false };
    
    // Status filter
    if (filters.status) query.status = filters.status;
    
    // Department filter
    if (filters.department) query.department = new mongoose.Types.ObjectId(filters.department);
    
    // Priority filter
    if (filters.priority) query.priority = filters.priority;
    
    // Date range - handle correctly without conflicts
    if (filters.from || filters.to) {
      query.dueDate = {};
      if (filters.from) {
        query.dueDate.$gte = new Date(filters.from);
      }
      if (filters.to) {
        const endDate = new Date(filters.to);
        endDate.setHours(23, 59, 59, 999);
        query.dueDate.$lte = endDate;
      }
    }
    
    // Search
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    return await Task.find(query)
      .populate('assignedTo', 'name email avatar department')
      .populate('assignedBy', 'name email avatar role')
      .populate('department', 'name')
      .sort({ 
        priority: -1,
        dueDate: 1,
        status: 1
      })
      .limit(filters.limit || 100);
  },

  // Get tasks assigned BY current user (tasks they created)
  async getAssignedByUser(userId, filters = {}) {
    try {
      console.log('🔍 [getAssignedByUser] Fetching tasks assigned by userId:', userId);
      
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const query = { assignedBy: userObjectId, isDeleted: false };
      
      // Status filter
      if (filters.status) {
        query.status = filters.status;
      }
      
      // Priority filter
      if (filters.priority) {
        query.priority = filters.priority;
      }
      
      // Search by title or description
      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
        ];
      }
      
      console.log('📋 [getAssignedByUser] Query object:', JSON.stringify(query, null, 2));
      
      const tasks = await Task.find(query)
        .populate('assignedTo', 'name email avatar')
        .populate('assignedBy', 'name email avatar')
        .populate('department', 'name')
        .sort({ 
          status: 1,
          createdAt: -1,
          priority: -1 
        })
        .limit(filters.limit || 50);
      
      console.log('✅ [getAssignedByUser] Found', tasks.length, 'tasks assigned by this user');
      
      // Debug: Check if any tasks exist
      if (tasks.length === 0) {
        const allTasks = await Task.find({ isDeleted: false }).select('assignedBy title -_id');
        console.log('⚠️ [getAssignedByUser] No tasks found. Total tasks in DB:', allTasks.length);
        if (allTasks.length > 0) {
          console.log('📊 [getAssignedByUser] Sample assignedBy values:', allTasks.slice(0, 5).map(t => ({
            assignedBy: t.assignedBy.toString(),
            title: t.title
          })));
          console.log('🔍 [getAssignedByUser] Comparing: Looking for:', userObjectId.toString());
        }
      }
      
      return tasks;
    } catch (error) {
      console.error('❌ [getAssignedByUser] Error:', error.message);
      throw error;
    }
  },

  // Create new task
  async createTask(data, assignedById) {
    // Validate required fields
    if (!data.title || typeof data.title !== 'string') {
      throw new Error('Task title is required and must be a string');
    }
    
    // Normalize assignedTo to array
    const assignedToRaw = Array.isArray(data.assignedTo)
      ? data.assignedTo
      : data.assignedTo
        ? [data.assignedTo]
        : [];

    if (assignedToRaw.length === 0) {
      throw new Error('Task must be assigned to at least one user');
    }

    if (!data.dueDate) {
      throw new Error('Due date is required');
    }

    // Validate each assignee exists
    for (const uid of assignedToRaw) {
      const found = await User.findById(uid);
      if (!found) throw new Error(`Assigned user not found: ${uid}`);
    }

    // Validate assignedBy exists
    const assignedByUser = await User.findById(assignedById);
    if (!assignedByUser) {
      throw new Error('Current user not found');
    }

    // Validate department if provided
    if (data.department) {
      const dept = await Department.findById(data.department);
      if (!dept) {
        throw new Error('Department not found');
      }
    }

    // Validate priority
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (data.priority && !validPriorities.includes(data.priority)) {
      data.priority = 'MEDIUM';
    }

    const estimatedMinutes = Math.max(
      0,
      Number.isFinite(Number(data.estimatedMinutes))
        ? Math.round(Number(data.estimatedMinutes))
        : Math.round((Number(data.estimatedHours) || 0) * 60)
    );

    const dueDate = data.dueDate ? new Date(data.dueDate) : null;

    const taskData = {
      title: data.title.trim(),
      description: data.description?.trim() || '',
      assignedTo: assignedToRaw.map(id => new mongoose.Types.ObjectId(id)),
      assignedBy: new mongoose.Types.ObjectId(assignedById),
      department: data.department ? new mongoose.Types.ObjectId(data.department) : null,
      dueDate,
      dueAt: null,
      priority: data.priority || 'MEDIUM',
      status: data.status || 'pending',
      timingState: 'not_started',
      tags: data.tags || [],
      progress: data.progress || 0,
      isRecurring: data.isRecurring || false,
      estimatedHours: Number(data.estimatedHours) || 0,
      estimatedMinutes,
      pausedDurationMs: 0,
      pausedDurationMinutes: 0
    };

    // Handle completion remarks if task is being created with completed status
    if (data.status === 'completed') {
      taskData.progress = 100;
      taskData.completedAt = new Date();
      if (data.completionRemarks) {
        taskData.completionRemarks = data.completionRemarks.trim();
      }
    }
    
    const task = await Task.create(taskData);
    await task.populate('assignedTo assignedBy department');
    return task;
  },

  // Update task status (complete/mark in-progress)
  async updateTaskStatus(taskId, userId, status, completionData = {}) {
    const validStatuses = ['pending', 'in-progress', 'paused', 'on-hold', 'completed', 'rejected', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status provided');
    }
    
    const task = await Task.findOne({ 
      _id: new mongoose.Types.ObjectId(taskId), 
      assignedTo: new mongoose.Types.ObjectId(userId),
      isDeleted: false
    });
    
    if (!task) {
      throw new Error('Task not found or access denied');
    }
    
    task.status = status;
    
    // Set startedAt when task is first marked as in-progress
    if (status === 'in-progress' && !task.startedAt) {
      task.startedAt = new Date();
    }
    
    if (status === 'completed') {
      // Validate completion remark is provided and meets minimum length
      if (!completionData.completionRemarks || completionData.completionRemarks.trim().length < 25) {
        throw new Error('Completion remarks must be at least 25 characters');
      }
      
      task.completedAt = new Date();
      task.completedBy = new mongoose.Types.ObjectId(userId);
      task.completionRemarks = completionData.completionRemarks.trim();
      task.progress = 100;
      
      // Store time tracking data if provided
      if (completionData.totalWorkedMilliseconds !== undefined) {
        task.totalWorkedMilliseconds = completionData.totalWorkedMilliseconds;
      }
      if (completionData.totalPausedMilliseconds !== undefined) {
        task.totalPausedMilliseconds = completionData.totalPausedMilliseconds;
      }
    } else if (status !== 'completed' && status !== 'in-progress') {
      // Only reset completedAt if task is being marked back to non completed status
      if (task.status === 'completed') {
        task.completedAt = null;
        task.completedBy = null;
      }
    }
    
    await task.save();
    await task.populate('assignedTo assignedBy department completedBy');
    return task;
  },

  // Update task (admin/HR only - full edit)
  async updateTask(taskId, data) {
    const task = await Task.findById(new mongoose.Types.ObjectId(taskId));
    if (!task || task.isDeleted) {
      throw new Error('Task not found');
    }
    
    // Validate assignedTo if changing it
    if (data.assignedTo && data.assignedTo !== task.assignedTo.toString()) {
      const user = await User.findById(data.assignedTo);
      if (!user) throw new Error('Assigned user not found');
    }
    
    // Validate department if changing it
    if (data.department && data.department !== task.department?.toString()) {
      const dept = await Department.findById(data.department);
      if (!dept) throw new Error('Department not found');
    }
    
    // Validate priority
    if (data.priority) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      if (!validPriorities.includes(data.priority)) {
        throw new Error('Invalid priority level');
      }
    }
    
    // Validate status
    if (data.status) {
      const validStatuses = ['pending', 'in-progress', 'completed', 'on-hold', 'cancelled'];
      if (!validStatuses.includes(data.status)) {
        throw new Error('Invalid status');
      }
    }
    
    // Update fields
    const allowedFields = ['title', 'description', 'assignedTo', 'department', 'dueDate', 'priority', 'status', 'progress', 'tags', 'isRecurring', 'recurrencePattern', 'completionRemarks'];
    allowedFields.forEach(field => {
      if (field in data) {
        task[field] = data[field];
      }
    });
    
    // Handle completion timestamp and remarks
    if (data.status === 'completed') {
      task.completedAt = new Date();
      task.progress = 100;
      if (data.completionRemarks) {
        task.completionRemarks = data.completionRemarks.trim();
      }
    }
    
    await task.save();
    await task.populate('assignedTo assignedBy department');
    return task;
  },

  // Delete task (admin/HR only - soft delete)
  async deleteTask(taskId) {
    const task = await Task.findById(new mongoose.Types.ObjectId(taskId));
    if (!task) {
      throw new Error('Task not found');
    }
    
    task.isDeleted = true;
    await task.save();
    return { message: 'Task deleted successfully' };
  },

  // Get task stats for dashboard (with all priorities and statuses)
  async getTaskStats(userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Get tasks by status
    const statusStats = await Task.aggregate([
      { 
        $match: { 
          assignedTo: userObjectId,
          isDeleted: false 
        } 
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get tasks by priority
    const priorityStats = await Task.aggregate([
      { 
        $match: { 
          assignedTo: userObjectId,
          isDeleted: false,
          status: { $ne: 'completed' }
        } 
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get overdue tasks
    const overdueCount = await Task.countDocuments({
      assignedTo: userObjectId,
      isDeleted: false,
      startedAt: { $ne: null },
      status: { $nin: ['completed', 'rejected', 'cancelled'] },
      $or: [
        { dueAt: { $lt: new Date() } },
        { dueAt: null, dueDate: { $lt: new Date() } }
      ]
    });
    
    return {
      byStatus: {
        pending: statusStats.find(s => s._id === 'pending')?.count || 0,
        'in-progress':
          (statusStats.find(s => s._id === 'in-progress')?.count || 0) +
          (statusStats.find(s => s._id === 'due-soon')?.count || 0),
        completed: statusStats.find(s => s._id === 'completed')?.count || 0,
        'on-hold':
          (statusStats.find(s => s._id === 'on-hold')?.count || 0) +
          (statusStats.find(s => s._id === 'paused')?.count || 0),
        cancelled: statusStats.find(s => s._id === 'cancelled')?.count || 0,
        total: statusStats.reduce((sum, s) => sum + s.count, 0)
      },
      byPriority: {
        LOW: priorityStats.find(p => p._id === 'LOW')?.count || 0,
        MEDIUM: priorityStats.find(p => p._id === 'MEDIUM')?.count || 0,
        HIGH: priorityStats.find(p => p._id === 'HIGH')?.count || 0,
        URGENT: priorityStats.find(p => p._id === 'URGENT')?.count || 0
      },
      overdue: overdueCount,
      completionRate: statusStats.reduce((sum, s) => sum + s.count, 0) > 0 
        ? Math.round(((statusStats.find(s => s._id === 'completed')?.count || 0) / statusStats.reduce((sum, s) => sum + s.count, 0)) * 100)
        : 0
    };
  },

  // Get recent pending/in-progress tasks for dashboard
  async getDashboardTasks(userId, limit = 5) {
    return await Task.find({ 
      assignedTo: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
      status: { $in: ['pending', 'in-progress', 'due-soon', 'paused'] } 
    })
      .populate('assignedBy', 'name avatar')
      .populate('department', 'name')
      .sort({ priority: -1, dueAt: 1, dueDate: 1 })
      .limit(limit);
  },

  // Get task by ID
  async getTaskById(taskId) {
    return await Task.findOne({ _id: new mongoose.Types.ObjectId(taskId), isDeleted: false })
      .populate('assignedTo', 'name email avatar department')
      .populate('assignedBy', 'name email avatar')
      .populate('department', 'name');
  },

  // Add comment to task
  async addComment(taskId, userId, comment) {
    const task = await Task.findById(new mongoose.Types.ObjectId(taskId));
    if (!task || task.isDeleted) {
      throw new Error('Task not found');
    }
    
    task.comments.push({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(userId),
      text: comment.trim(),
      createdAt: new Date()
    });
    
    await task.save();
    await task.populate('comments.userId', 'name avatar');
    return task;
  },

  // Update task progress
  async updateProgress(taskId, userId, progress) {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    
    const task = await Task.findOne({
      _id: new mongoose.Types.ObjectId(taskId),
      assignedTo: new mongoose.Types.ObjectId(userId),
      isDeleted: false
    });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    task.progress = progress;
    if (progress === 100) {
      task.status = 'completed';
      task.completedAt = new Date();
    }
    
    await task.save();
    return task;
  },

  // Get all tasks analytics (admin/HR only)
  async getAllTasksAnalytics(dateRange = 'month') {
    // Calculate date range
    const now = new Date();
    let fromDate = new Date();
    
    switch(dateRange) {
      case 'week':
        fromDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        fromDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        fromDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        fromDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        fromDate.setMonth(now.getMonth() - 1);
    }

    const query = {
      isDeleted: false,
      createdAt: { $gte: fromDate, $lte: now }
    };

    // Get all tasks
    const allTasks = await Task.find(query);
    
    // Get completed tasks
    const completedTasks = await Task.countDocuments({
      ...query,
      status: 'completed'
    });

    // Get in-progress tasks
    const inProgressTasks = await Task.countDocuments({
      ...query,
      status: 'in-progress'
    });

    // Get pending tasks
    const pendingTasks = await Task.countDocuments({
      ...query,
      status: 'pending'
    });

    // Get on-hold tasks
    const onHoldTasks = await Task.countDocuments({
      ...query,
      status: 'on-hold'
    });

    // Get cancelled tasks
    const cancelledTasks = await Task.countDocuments({
      ...query,
      status: 'cancelled'
    });

    // Get tasks by priority
    const byPriority = await Task.aggregate([
      { $match: query },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Get overdue tasks
    const overdueCount = await Task.countDocuments({
      ...query,
      startedAt: { $ne: null },
      status: { $nin: ['completed', 'rejected', 'cancelled'] },
      $or: [
        { dueAt: { $lt: now } },
        { dueAt: null, dueDate: { $lt: now } }
      ]
    });

    const totalTasks = allTasks.length;
    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    return {
      completionRate,
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      onHoldTasks,
      cancelledTasks,
      overdueCount,
      byPriority: {
        LOW: byPriority.find(p => p._id === 'LOW')?.count || 0,
        MEDIUM: byPriority.find(p => p._id === 'MEDIUM')?.count || 0,
        HIGH: byPriority.find(p => p._id === 'HIGH')?.count || 0,
        URGENT: byPriority.find(p => p._id === 'URGENT')?.count || 0
      },
      dateRange
    };
  },

  // Get team performance analytics (admin/HR only)
  async getTeamPerformanceAnalytics(dateRange = 'month') {
    const now = new Date();
    const fromDate = new Date();

    switch (dateRange) {
      case 'week':
        fromDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        fromDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        fromDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        fromDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        fromDate.setMonth(now.getMonth() - 1);
    }

    const taskQueryBase = {
      isDeleted: false,
      createdAt: { $gte: fromDate, $lte: now }
    };

    // Get all users with tasks
    const teamMembers = await User.find({
      role: { $in: [ROLES.USER, ROLES.HR] }
    }).select('_id name userName email');
    
    const performance = await Promise.all(
      teamMembers.map(async (member) => {
        const userId = member._id;

        const totalTasks = await Task.countDocuments({
          assignedTo: userId,
          ...taskQueryBase
        });

        const completedOnTime = await Task.countDocuments({
          assignedTo: userId,
          status: 'completed',
          completedOnTime: true,
          ...taskQueryBase
        });

        const completedLate = await Task.countDocuments({
          assignedTo: userId,
          status: 'completed',
          completedOnTime: false,
          ...taskQueryBase
        });

        const overdueCount = await Task.countDocuments({
          assignedTo: userId,
          ...taskQueryBase,
          startedAt: { $ne: null },
          status: { $nin: ['completed', 'rejected', 'cancelled'] },
          $or: [
            { dueAt: { $lt: new Date() } },
            { dueAt: null, dueDate: { $lt: new Date() } }
          ]
        });

        const extensionCount = await Task.aggregate([
          {
            $match: {
              assignedTo: userId,
              ...taskQueryBase
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $ifNull: ['$extensionCount', 0] } }
            }
          }
        ]);

        const rejectedTasks = await Task.countDocuments({
          assignedTo: userId,
          status: 'rejected',
          ...taskQueryBase
        });

        const extensionRequestMetrics = await Task.aggregate([
          {
            $match: {
              assignedTo: userId,
              ...taskQueryBase
            }
          },
          {
            $project: {
              extensionRequests: { $ifNull: ['$extensionRequests', []] },
              isOverdueWithoutRequest: {
                $and: [
                  { $eq: ['$status', 'overdue'] },
                  { $eq: [{ $size: { $ifNull: ['$extensionRequests', []] } }, 0] }
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              extensionRequests: { $sum: { $size: '$extensionRequests' } },
              approvedExtensions: {
                $sum: {
                  $size: {
                    $filter: {
                      input: '$extensionRequests',
                      as: 'request',
                      cond: { $eq: ['$$request.approvalStatus', 'approved'] }
                    }
                  }
                }
              },
              rejectedExtensions: {
                $sum: {
                  $size: {
                    $filter: {
                      input: '$extensionRequests',
                      as: 'request',
                      cond: { $eq: ['$$request.approvalStatus', 'rejected'] }
                    }
                  }
                }
              },
              overdueWithoutRequest: {
                $sum: { $cond: ['$isOverdueWithoutRequest', 1, 0] }
              }
            }
          }
        ]);

        const completed = completedOnTime + completedLate;

        // Count in-progress tasks
        const inProgress = await Task.countDocuments({
          assignedTo: userId,
          status: { $in: ['in-progress', 'paused', 'on-hold', 'due-soon', 'extended', 'overdue'] },
          isDeleted: false
        });

        // Calculate average completion time
        const completedTasksData = await Task.find({
          assignedTo: userId,
          status: 'completed',
          ...taskQueryBase,
          completedAt: { $exists: true }
        }).select('createdAt completedAt');

        let avgCompletionTime = 'N/A';
        if (completedTasksData.length > 0) {
          const totalTime = completedTasksData.reduce((sum, task) => {
            const time = task.completedAt - task.createdAt;
            return sum + time;
          }, 0);
          const avgMs = totalTime / completedTasksData.length;
          const avgDays = Math.floor(avgMs / (1000 * 60 * 60 * 24));
          avgCompletionTime = avgDays > 0 ? `${avgDays} days` : '< 1 day';
        }

        // Calculate performance score (0-100)
        const metrics = {
          totalTasks,
          completedOnTime,
          completedLate,
          overdueCount,
          extensionCount: extensionCount[0]?.total || 0,
          rejectedTasks,
          extensionRequests: extensionRequestMetrics[0]?.extensionRequests || 0,
          approvedExtensions: extensionRequestMetrics[0]?.approvedExtensions || 0,
          rejectedExtensions: extensionRequestMetrics[0]?.rejectedExtensions || 0,
          overdueWithoutRequest: extensionRequestMetrics[0]?.overdueWithoutRequest || 0,
        };

        const performance = evaluateEmployeePerformance(metrics);

        const performanceScore = totalTasks > 0
          ? Math.round(((completedOnTime * 1.2 + completedLate * 0.7) / totalTasks) * 100)
          : 0;

        return {
          _id: userId,
          name: member.name,
          userName: member.userName,
          email: member.email,
          totalTasks,
          completedOnTime,
          completedLate,
          overdueCount,
          extensionCount: metrics.extensionCount,
          rejectedTasks,
          extensionRequests: metrics.extensionRequests,
          approvedExtensions: metrics.approvedExtensions,
          rejectedExtensions: metrics.rejectedExtensions,
          overdueWithoutRequest: metrics.overdueWithoutRequest,
          completed,
          inProgress,
          avgCompletionTime,
          performanceScore,
          classification: performance.classification,
          onTimeRate: performance.onTimeRate
        };
      })
    );

    // Filter out users with no tasks and sort by performance score
    return performance
      .filter(member => member.totalTasks > 0)
      .sort((a, b) => b.performanceScore - a.performanceScore);
  },

  // Diagnostic function to debug why tasks aren't showing
  async getTasksDiagnostics(userId) {
    console.log('🔍 [DIAGNOSTICS] Starting diagnostic check for user:', userId);
    
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Check 1: Does user exist?
    const user = await User.findById(userObjectId);
    const userExists = !!user;
    console.log('👤 [DIAGNOSTICS] User exists:', userExists, user ? user.email : 'N/A');
    
    // Check 2: Total tasks in database
    const totalTasksInDB = await Task.countDocuments({ isDeleted: false });
    console.log('📊 [DIAGNOSTICS] Total tasks in DB:', totalTasksInDB);
    
    // Check 3: Tasks assigned to this user
    const myTasksCount = await Task.countDocuments({
      assignedTo: userObjectId,
      isDeleted: false
    });
    console.log('👥 [DIAGNOSTICS] Tasks assigned to this user:', myTasksCount);
    
    // Check 4: Get sample of all tasks to see assignedTo values
    const sampleTasks = await Task.find({ isDeleted: false })
      .select('title assignedTo -_id')
      .limit(5);
    console.log('📋 [DIAGNOSTICS] Sample tasks:', sampleTasks.map(t => ({
      title: t.title,
      assignedTo: t.assignedTo
    })));
    
    // Check 5: Find who tasks are actually assigned to
    const assignmentDistribution = await Task.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    console.log('📈 [DIAGNOSTICS] Task assignment distribution:', assignmentDistribution);
    
    // Check 6: Tasks created by this user
    const tasksByMe = await Task.countDocuments({
      assignedBy: userObjectId,
      isDeleted: false
    });
    console.log('🎯 [DIAGNOSTICS] Tasks created by this user:', tasksByMe);
    
    // Check 7: Get actual my tasks to see what we're returning
    const myTasks = await Task.find({
      assignedTo: userObjectId,
      isDeleted: false
    }).select('title status priority dueDate');
    console.log('📃 [DIAGNOSTICS] Actual my tasks:', myTasks);
    
    return {
      diagnostics: {
        userExists,
        userEmail: user?.email,
        userId: userId,
        userObjectId: userObjectId.toString(),
        totalTasksInDB,
        myTasksCount,
        tasksByMe,
        myTasks: myTasks.map(t => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate
        })),
        assignmentDistribution: assignmentDistribution.map(d => ({
          assignedTo: d._id.toString(),
          count: d.count
        }))
      },
      recommendation: myTasksCount === 0 
        ? 'No tasks are assigned to this user. Check: 1) Is the user assigning tasks to themselves? 2) Are other users assigning tasks to them? 3) Try creating a test task.'
        : `Found ${myTasksCount} tasks assigned to this user.`
    };
  },

  // ─── WORKFLOW MANAGEMENT ───────────────────────────────────────────────────────────

  // Hold task (move to ON_HOLD status with reason)
  async holdTask(taskId, userId, holdReason) {
    const task = await Task.findOne({
      _id: new mongoose.Types.ObjectId(taskId),
      isDeleted: false
    }).populate('assignedTo', 'name email');

    if (!task) {
      throw new Error('Task not found');
    }

    // Check if user is assigned to or manager of the task
    const isAssignee = task.assignedTo?.some(a => a?._id?.toString() === userId || a?.toString() === userId);
    
    if (!isAssignee) {
      throw new Error('Only assigned users can hold this task');
    }

    // Validate status transition
    if (!['pending', 'in-progress'].includes(task.status)) {
      throw new Error(`Cannot hold task with status: ${task.status}`);
    }

    if (!holdReason || typeof holdReason !== 'string' || !holdReason.trim()) {
      throw new Error('Hold reason is required');
    }

    task.status = 'on-hold';
    task.holdReason = holdReason.trim();
    task.isRunning = false;
    
    // Close any open pause entry
    if (task.isPaused && task.pauseEntries.length > 0) {
      const lastPause = task.pauseEntries[task.pauseEntries.length - 1];
      if (!lastPause.resumedAt) {
        const now = new Date();
        const pausedSeconds = Math.max(0, Math.floor((now - new Date(lastPause.pausedAt)) / 1000));
        lastPause.resumedAt = now;
        lastPause.pausedDurationInSeconds = pausedSeconds;
        task.totalPausedTimeInSeconds += pausedSeconds;
        task.pausedDurationMs += pausedSeconds * 1000;
      }
    }
    
    task.isPaused = false;
    task.currentSessionStartTime = null;
    task.timingState = TASK_TIMING_STATE.PAUSED;
    syncTaskTimingFields(task, new Date());

    await task.save();
    await task.populate([
      { path: 'assignedTo', select: 'name email' },
      { path: 'assignedBy', select: 'name email' }
    ]);
    return task;
  },

  // Resume task from ON_HOLD status
  async resumeTaskFromHold(taskId, userId) {
    const task = await Task.findOne({
      _id: new mongoose.Types.ObjectId(taskId),
      isDeleted: false
    }).populate('assignedTo', 'name email');

    if (!task) {
      throw new Error('Task not found');
    }

    // Check if user is assigned to the task
    const isAssignee = task.assignedTo?.some(a => a?._id?.toString() === userId || a?.toString() === userId);
    
    if (!isAssignee) {
      throw new Error('Only assigned users can resume this task');
    }

    if (task.status !== 'on-hold') {
      throw new Error(`Cannot resume task with status: ${task.status}`);
    }

    task.status = 'in-progress';
    task.holdReason = null;
    task.isRunning = true;
    task.isPaused = false;
    task.timingState = TASK_TIMING_STATE.IN_PROGRESS;
    task.currentSessionStartTime = new Date();
    syncTaskTimingFields(task, new Date());

    await task.save();
    await task.populate([
      { path: 'assignedTo', select: 'name email' },
      { path: 'assignedBy', select: 'name email' }
    ]);
    return task;
  },

  // Reassign task to another user
  async reassignTask(taskId, newAssigneeId, reasonText, performedById) {
    const task = await Task.findOne({
      _id: new mongoose.Types.ObjectId(taskId),
      isDeleted: false
    }).populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email');

    if (!task) {
      throw new Error('Task not found');
    }

    // Validate new assignee exists
    const newAssignee = await User.findById(new mongoose.Types.ObjectId(newAssigneeId));
    if (!newAssignee) {
      throw new Error('New assignee not found');
    }

    if (newAssignee.isDeleted) {
      throw new Error('Cannot assign to a deleted user');
    }

    const performer = await User.findById(new mongoose.Types.ObjectId(performedById));
    if (!performer) {
      throw new Error('Performer not found');
    }

    // Store old assignee info for history
    const previousAssignees = task.assignedTo;
    const previousAssigneeNames = previousAssignees.map(a => a.name || 'Unknown').join(', ');

    // Add to reassignment history
    for (const oldAssignee of previousAssignees) {
      task.reassignedHistory.push({
        previousAssignee: oldAssignee._id,
        previousAssigneeName: oldAssignee.name || 'Unknown',
        newAssignee: new mongoose.Types.ObjectId(newAssigneeId),
        newAssigneeName: newAssignee.name || 'Unknown',
        reassignedBy: new mongoose.Types.ObjectId(performedById),
        reason: reasonText || 'Task reassigned',
        reassignedAt: new Date()
      });
    }

    // Update assignee (replace old with new)
    task.assignedTo = [new mongoose.Types.ObjectId(newAssigneeId)];
    task.reassignedFrom = previousAssignees[0];
    task.reassignedAt = new Date();

    await task.save();
    await task.populate([
      { path: 'assignedTo', select: 'name email' },
      { path: 'assignedBy', select: 'name email' },
      { path: 'reassignedHistory.previousAssignee', select: 'name email' },
      { path: 'reassignedHistory.newAssignee', select: 'name email' },
      { path: 'reassignedHistory.reassignedBy', select: 'name email' }
    ]);
    return task;
  },

  // Get task timeline (activity history)
  async getTaskTimeline(taskId) {
    const task = await Task.findOne({
      _id: new mongoose.Types.ObjectId(taskId),
      isDeleted: false
    }).populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('comments.userId', 'name email avatar')
      .populate('reassignedHistory.previousAssignee', 'name email')
      .populate('reassignedHistory.newAssignee', 'name email')
      .populate('reassignedHistory.reassignedBy', 'name email');

    if (!task) {
      throw new Error('Task not found');
    }

    // Build timeline from various sources
    const timeline = [];

    // Task creation
    timeline.push({
      type: 'CREATED',
      timestamp: task.createdAt,
      description: `Task created by ${task.assignedBy?.name || 'Unknown'}`,
      actor: task.assignedBy,
      details: {
        title: task.title,
        priority: task.priority
      }
    });

    // Status changes (from comments and history)
    if (task.startedAt) {
      timeline.push({
        type: 'STARTED',
        timestamp: task.startedAt,
        description: 'Task started',
        details: { status: 'in-progress' }
      });
    }

    if (task.completedAt) {
      timeline.push({
        type: 'COMPLETED',
        timestamp: task.completedAt,
        description: 'Task completed',
        details: { status: 'completed' }
      });
    }

    // Reassignments
    for (const reassignment of task.reassignedHistory || []) {
      timeline.push({
        type: 'REASSIGNED',
        timestamp: reassignment.reassignedAt,
        description: `Reassigned from ${reassignment.previousAssigneeName} to ${reassignment.newAssigneeName}`,
        actor: reassignment.reassignedBy,
        details: {
          from: reassignment.previousAssignee,
          to: reassignment.newAssignee,
          reason: reassignment.reason
        }
      });
    }

    // Comments
    for (const comment of task.comments || []) {
      timeline.push({
        type: 'COMMENT',
        timestamp: comment.createdAt,
        description: `${comment.userId?.name || 'Unknown'} commented`,
        actor: comment.userId,
        details: { text: comment.text }
      });
    }

    // Sort by timestamp descending (newest first)
    timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      taskId: task._id,
      title: task.title,
      status: task.status,
      timeline: timeline
    };
  },

  // Check user workload (count active tasks)
  async checkWorkload(userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    const activeTasks = await Task.countDocuments({
      assignedTo: { $in: [userObjectId] },
      isDeleted: false,
      status: { $in: ['pending', 'in-progress', 'on-hold'] }
    });

    const workloadLimitWarning = activeTasks > 6;

    return {
      userId,
      activeTasks,
      workloadLimitWarning,
      message: workloadLimitWarning 
        ? `User has ${activeTasks} active tasks (limit: 6). Assignment may cause overload.`
        : `User has ${activeTasks} active tasks for a healthy workload.`
    };
  },

  // Check and update overdue tasks
  async checkAndUpdateOverdueTasks() {
    const now = new Date();
    
    const overdueTasks = await Task.updateMany(
      {
        isDeleted: false,
        startedAt: { $ne: null },
        status: { $nin: ['completed', 'rejected', 'cancelled', 'extension_requested'] },
        dueAt: { $ne: null, $lt: now }
      },
      {
        $set: { status: 'overdue', timingState: 'overdue' }
      }
    );

    return {
      updatedCount: overdueTasks.modifiedCount,
      message: `${overdueTasks.modifiedCount} tasks marked as overdue`
    };
  },

  // Get task completion trends for last N days
  async getTaskCompletionTrends(userId, days = 7) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // For admin/HR, get all tasks. For employees, get only their tasks
    const query = {
      isDeleted: false,
      status: 'completed',
      completedAt: { $gte: startDate, $lte: now }
    };

    // If userId is provided and not admin, filter by assigned user
    if (userId) {
      query.assignedTo = new mongoose.Types.ObjectId(userId);
    }

    // Aggregate tasks by date
    const trendData = await Task.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' }
          },
          count: { $sum: 1 },
          onTimeCount: {
            $sum: { $cond: [{ $eq: ['$completedOnTime', true] }, 1, 0] }
          },
          lateCount: {
            $sum: { $cond: [{ $eq: ['$completedOnTime', false] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing dates with zero counts
    const dateMap = new Map();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, { date: dateStr, completed: 0, onTime: 0, late: 0 });
    }

    // Populate with actual data
    trendData.forEach(item => {
      if (dateMap.has(item._id)) {
        const entry = dateMap.get(item._id);
        entry.completed = item.count;
        entry.onTime = item.onTimeCount;
        entry.late = item.lateCount;
      }
    });

    // Convert map to array and sort
    const chartData = Array.from(dateMap.values()).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Calculate summary stats
    const totalCompleted = chartData.reduce((sum, d) => sum + d.completed, 0);
    const totalOnTime = chartData.reduce((sum, d) => sum + d.onTime, 0);
    const onTimePercentage = totalCompleted > 0 ? Math.round((totalOnTime / totalCompleted) * 100) : 0;

    return {
      period: `Last ${days} days`,
      summary: {
        totalCompleted,
        totalOnTime,
        totalLate: totalCompleted - totalOnTime,
        onTimePercentage
      },
      data: chartData
    };
  },

  // Send daily reminders for incomplete tasks
  async sendDailyIncompleteTasksReminder() {
    console.log('📅 [DAILY_REMINDER] Starting daily incomplete tasks reminder process...');
    
    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Find all users with incomplete tasks
      const users = await User.find({ isDeleted: false }).select('_id name email');
      
      let remindersCount = 0;
      const reminders = [];
      
      for (const user of users) {
        // Get incomplete tasks for this user
        const incompleteTasks = await Task.find({
          assignedTo: user._id,
          isDeleted: false,
          status: { $nin: ['completed', 'rejected', 'cancelled'] }
        }).select('_id title priority status dueDate dueAt');
        
        if (incompleteTasks.length > 0) {
          // Categorize tasks
          const overdueTasks = incompleteTasks.filter(t => {
            const dueDate = t.dueAt || t.dueDate;
            return dueDate && new Date(dueDate) < now;
          });
          
          const dueTodayTasks = incompleteTasks.filter(t => {
            const dueDate = t.dueAt || t.dueDate;
            return dueDate && new Date(dueDate) >= startOfDay && new Date(dueDate) <= endOfDay;
          });
          
          const urgentTasks = incompleteTasks.filter(t => t.priority === 'URGENT');
          
          // Only send reminder if user has tasks worth reminding about
          if (overdueTasks.length > 0 || dueTodayTasks.length > 0 || urgentTasks.length > 0) {
            const reminderData = {
              userId: user._id,
              userName: user.name,
              email: user.email,
              taskCounts: {
                total: incompleteTasks.length,
                overdue: overdueTasks.length,
                dueToday: dueTodayTasks.length,
                urgent: urgentTasks.length
              },
              tasks: {
                overdue: overdueTasks.map(t => ({ id: t._id, title: t.title, priority: t.priority })),
                dueToday: dueTodayTasks.map(t => ({ id: t._id, title: t.title, priority: t.priority })),
                urgent: urgentTasks.map(t => ({ id: t._id, title: t.title, dueDate: t.dueAt || t.dueDate }))
              },
              sentAt: now,
              type: 'DAILY_INCOMPLETE_TASKS_REMINDER'
            };
            
            reminders.push(reminderData);
            remindersCount++;
            
            console.log(`✅ [DAILY_REMINDER] Prepared reminder for ${user.name} (${overdueTasks.length} overdue, ${dueTodayTasks.length} due today, ${urgentTasks.length} urgent)`);
          }
        }
      }
      
      console.log(`📊 [DAILY_REMINDER] Total reminders prepared: ${remindersCount}`);
      
      return {
        success: true,
        remindersCount,
        timestamp: now,
        message: `Daily reminder process completed. ${remindersCount} reminders sent to users with incomplete tasks.`,
        reminders
      };
    } catch (error) {
      console.error('❌ [DAILY_REMINDER] Error in daily reminder process:', error);
      throw error;
    }
  }
};

export default tasksService;
