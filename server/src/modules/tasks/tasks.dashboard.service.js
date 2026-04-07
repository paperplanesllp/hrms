import mongoose from 'mongoose';
import { Task } from './Task.model.js';

/**
 * Task Analytics Dashboard Service
 * Provides real-time metrics for task management dashboard
 * Timezone: Asia/Kolkata (IST)
 */
export const tasksDashboardService = {
  /**
   * Get comprehensive task analytics for dashboard
   * Calculates all metrics using efficient MongoDB aggregation
   * @param {string} userId - User ID for personal dashboard (optional)
   * @param {string} departmentId - Filter by department (optional)
   * @returns {Promise<Object>} Dashboard metrics
   */
  async getTasksDashboardAnalytics(userId = null, departmentId = null) {
    try {
      // IST offset: +5:30 hours = 19800 seconds = 330 minutes
      const IST_OFFSET = 5.5 * 60 * 60 * 1000; // Convert to milliseconds
      const now = new Date();
      const istNow = new Date(now.getTime() + IST_OFFSET);
      
      // Calculate start of today IST (00:00:00 IST)
      const todayIST = new Date(istNow);
      todayIST.setUTCHours(0, 0, 0, 0);
      todayIST.setTime(todayIST.getTime() - IST_OFFSET);
      
      // Build base match stage based on filters
      const matchStage = { isDeleted: false };
      if (userId) {
        matchStage.assignedTo = new mongoose.Types.ObjectId(userId);
      }
      if (departmentId) {
        matchStage.department = new mongoose.Types.ObjectId(departmentId);
      }

      // Use MongoDB aggregation pipeline for efficiency
      const analyticsResult = await Task.aggregate([
        { $match: matchStage },
        {
          $facet: {
            // Count tasks by status
            statusStats: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              }
            ],
            // Count overdue tasks (dueDate < today IST and not completed)
            overdueStats: [
              {
                $match: {
                  status: { $ne: 'completed' },
                  dueDate: { $lt: todayIST }
                }
              },
              { $count: 'count' }
            ],
            // Count tasks completed today
            completedTodayStats: [
              {
                $match: {
                  status: 'completed',
                  completedAt: { $gte: todayIST }
                }
              },
              { $count: 'count' }
            ],
            // Get priority breakdown
            priorityStats: [
              {
                $group: {
                  _id: '$priority',
                  count: { $sum: 1 }
                }
              }
            ],
            // Get average completion time (in hours)
            averageCompletionTime: [
              {
                $match: { status: 'completed', completedAt: { $exists: true } }
              },
              {
                $project: {
                  completionTime: {
                    $divide: [
                      { $subtract: ['$completedAt', '$createdAt'] },
                      3600000 // Convert ms to hours
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  avgTime: { $avg: '$completionTime' }
                }
              }
            ],
            // Count active (in-progress or pending) tasks
            activeTasks: [
              {
                $match: {
                  status: { $in: ['pending', 'in-progress'] }
                }
              },
              { $count: 'count' }
            ],
            // Total tasks
            totalTasks: [{ $count: 'count' }]
          }
        }
      ]);

      // Extract results from aggregation
      const result = analyticsResult[0];
      
      // Parse status counts
      const statusMap = {};
      result.statusStats.forEach(stat => {
        statusMap[stat._id] = stat.count;
      });

      // Parse priority counts
      const priorityMap = {};
      result.priorityStats.forEach(stat => {
        priorityMap[stat._id] = stat.count;
      });

      // Calculate metrics
      const totalTasks = result.totalTasks[0]?.count || 0;
      const completedTasks = statusMap['completed'] || 0;
      const inProgressTasks = statusMap['in-progress'] || 0;
      const pendingTasks = statusMap['pending'] || 0;
      const onHoldTasks = statusMap['on-hold'] || 0;
      const cancelledTasks = statusMap['cancelled'] || 0;
      const overdueTasks = result.overdueStats[0]?.count || 0;
      const completedToday = result.completedTodayStats[0]?.count || 0;
      const activeTasks = result.activeTasks[0]?.count || 0;
      const avgCompletionTime = Math.round(result.averageCompletionTime[0]?.avgTime || 0);

      // Calculate rates
      const completionRate = totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      const goalProgress = totalTasks > 0 
        ? Math.round(((totalTasks - overdueTasks) / totalTasks) * 100)
        : 0;

      const onTimeCompletionRate = totalTasks > 0
        ? Math.round(((completedTasks - overdueTasks) / totalTasks) * 100)
        : 0;

      // Build response
      const dashboardData = {
        timestamp: new Date().toISOString(),
        timezone: 'Asia/Kolkata (IST)',
        metrics: {
          // Total counts
          totalTasks,
          completedTasks,
          pendingTasks,
          inProgressTasks,
          onHoldTasks,
          cancelledTasks,
          overdueTasks,
          completedToday,
          activeTasks,

          // Rates and progress
          completionRate, // Percentage of completed tasks
          goalProgress, // Percentage of tasks on track (not overdue)
          onTimeCompletionRate, // Percentage of tasks completed on time

          // Performance metrics
          avgCompletionTime, // Average hours to complete

          // Priority breakdown
          priority: {
            urgent: priorityMap['URGENT'] || 0,
            high: priorityMap['HIGH'] || 0,
            medium: priorityMap['MEDIUM'] || 0,
            low: priorityMap['LOW'] || 0
          },

          // Status breakdown
          status: {
            pending: pendingTasks,
            'in-progress': inProgressTasks,
            completed: completedTasks,
            'on-hold': onHoldTasks,
            cancelled: cancelledTasks,
            overdue: overdueTasks
          }
        },
        // Summary insights
        insights: {
          isHealthy: completionRate >= 70 && goalProgress >= 80,
          urgentTasksCount: (priorityMap['URGENT'] || 0) + overdueTasks,
          needsAttention: overdueTasks > 0 || activeTasks === 0,
          estimatedCompletion: avgCompletionTime > 0 
            ? `${avgCompletionTime} hours average`
            : 'N/A'
        }
      };

      return dashboardData;
    } catch (error) {
      console.error('❌ [Dashboard Service] Error in getTasksDashboardAnalytics:', error);
      throw error;
    }
  },

  /**
   * Get team task analytics (for HR/Admin)
   * Shows performance metrics for all team members
   */
  async getTeamTaskAnalytics(departmentId = null) {
    try {
      const matchStage = { isDeleted: false };
      if (departmentId) {
        matchStage.department = new mongoose.Types.ObjectId(departmentId);
      }

      const teamStats = await Task.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $arrayElemAt: ['$assignedTo', 0] }, // Get first assignee
            totalTasks: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            overdue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$status', 'completed'] },
                      { $lt: ['$dueDate', new Date()] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $addFields: { user: { $arrayElemAt: ['$user', 0] } } },
        {
          $project: {
            _id: 1,
            userId: '$_id',
            userName: '$user.name',
            email: '$user.email',
            totalTasks: 1,
            completed: 1,
            inProgress: 1,
            pending: 1,
            overdue: 1,
            completionRate: {
              $cond: [
                { $gt: ['$totalTasks', 0] },
                { $round: [{ $multiply: [{ $divide: ['$completed', '$totalTasks'] }, 100] }] },
                0
              ]
            }
          }
        },
        { $sort: { completionRate: -1 } }
      ]);

      return {
        timestamp: new Date().toISOString(),
        teamSize: teamStats.length,
        members: teamStats
      };
    } catch (error) {
      console.error('❌ [Dashboard Service] Error in getTeamTaskAnalytics:', error);
      throw error;
    }
  },

  /**
   * Get task trends over time
   * Returns task completion metrics for the past N days
   */
  async getTaskTrends(days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const trends = await Task.aggregate([
        {
          $match: {
            isDeleted: false,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            created: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'completed'] },
                      { $gte: ['$completedAt', startDate] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        period: `${days} days`,
        startDate,
        endDate,
        data: trends
      };
    } catch (error) {
      console.error('❌ [Dashboard Service] Error in getTaskTrends:', error);
      throw error;
    }
  }
};
