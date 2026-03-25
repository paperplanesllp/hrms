import mongoose from 'mongoose';
import { Task } from './Task.model.js';
import { User } from '../users/User.model.js';
import { Department } from '../department/Department.model.js';

export const tasksService = {
  // Get my tasks (assigned to current user)
  async getMyTasks(userId, filters = {}) {
    const query = { assignedTo: new mongoose.Types.ObjectId(userId), isDeleted: false };
    
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
    
    return tasks;
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

  // Create new task
  async createTask(data, assignedById) {
    // Validate required fields
    if (!data.title || typeof data.title !== 'string') {
      throw new Error('Task title is required and must be a string');
    }
    
    if (!data.assignedTo) {
      throw new Error('Task must be assigned to a user');
    }
    
    if (!data.dueDate) {
      throw new Error('Due date is required');
    }
    
    // Validate assignedTo exists
    const assignedUser = await User.findById(data.assignedTo);
    if (!assignedUser) {
      throw new Error('Assigned user not found');
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
    
    const taskData = {
      title: data.title.trim(),
      description: data.description?.trim() || '',
      assignedTo: new mongoose.Types.ObjectId(data.assignedTo),
      assignedBy: new mongoose.Types.ObjectId(assignedById),
      department: data.department ? new mongoose.Types.ObjectId(data.department) : null,
      dueDate: new Date(data.dueDate),
      priority: data.priority || 'MEDIUM',
      status: data.status || 'pending',
      tags: data.tags || [],
      progress: data.progress || 0,
      isRecurring: data.isRecurring || false
    };
    
    const task = await Task.create(taskData);
    await task.populate('assignedTo assignedBy department');
    return task;
  },

  // Update task status (complete/mark in-progress)
  async updateTaskStatus(taskId, userId, status) {
    const validStatuses = ['pending', 'in-progress', 'completed', 'on-hold', 'cancelled'];
    
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
    
    if (status === 'completed') {
      task.completedAt = new Date();
      task.progress = 100;
    } else if (status === 'in-progress' && !task.completedAt) {
      // Only reset completedAt if task is being marked back to in-progress
      if (task.status !== 'in-progress') {
        task.completedAt = null;
      }
    }
    
    await task.save();
    await task.populate('assignedTo assignedBy department');
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
    const allowedFields = ['title', 'description', 'assignedTo', 'department', 'dueDate', 'priority', 'status', 'progress', 'tags', 'isRecurring', 'recurrencePattern'];
    allowedFields.forEach(field => {
      if (field in data) {
        task[field] = data[field];
      }
    });
    
    if (data.status === 'completed') {
      task.completedAt = new Date();
      task.progress = 100;
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
      status: { $ne: 'completed' },
      dueDate: { $lt: new Date() }
    });
    
    return {
      byStatus: {
        pending: statusStats.find(s => s._id === 'pending')?.count || 0,
        'in-progress': statusStats.find(s => s._id === 'in-progress')?.count || 0,
        completed: statusStats.find(s => s._id === 'completed')?.count || 0,
        'on-hold': statusStats.find(s => s._id === 'on-hold')?.count || 0,
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
      status: { $in: ['pending', 'in-progress'] } 
    })
      .populate('assignedBy', 'name avatar')
      .populate('department', 'name')
      .sort({ priority: -1, dueDate: 1 })
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

    const query = { isDeleted: false };

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
      status: { $ne: 'completed' },
      dueDate: { $lt: now }
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
  async getTeamPerformanceAnalytics() {
    // Get all users with tasks
    const teamMembers = await User.find({ isDeleted: false }).select('_id name userName email');
    
    const performance = await Promise.all(
      teamMembers.map(async (member) => {
        const userId = member._id;

        // Count completed tasks
        const completed = await Task.countDocuments({
          assignedTo: userId,
          status: 'completed',
          isDeleted: false
        });

        // Count in-progress tasks
        const inProgress = await Task.countDocuments({
          assignedTo: userId,
          status: 'in-progress',
          isDeleted: false
        });

        // Count all tasks
        const totalTasks = await Task.countDocuments({
          assignedTo: userId,
          isDeleted: false
        });

        // Calculate average completion time
        const completedTasksData = await Task.find({
          assignedTo: userId,
          status: 'completed',
          isDeleted: false,
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
        let performanceScore = 0;
        if (totalTasks > 0) {
          performanceScore = Math.round((completed / totalTasks) * 100);
        }

        return {
          _id: userId,
          name: member.name,
          userName: member.userName,
          email: member.email,
          completed,
          inProgress,
          totalTasks,
          avgCompletionTime,
          performanceScore
        };
      })
    );

    // Filter out users with no tasks and sort by performance score
    return performance
      .filter(member => member.totalTasks > 0)
      .sort((a, b) => b.performanceScore - a.performanceScore);
  }
};
