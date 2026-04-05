/**
 * Task Suggestion Service
 * Generates intelligent task suggestions based on user history, role, and patterns
 */

import Task from '../Task.model.js';
import EmployeeProductivity from '../EmployeeProductivity.model.js';
import User from '../../users/User.model.js';
import Department from '../../departments/Department.model.js';

class TaskSuggestionService {
  /**
   * Generate suggestions for a user
   */
  async generateSuggestions(userId, limit = 5) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const suggestions = [];

      // Strategy 1: Pattern-based recurring tasks
      const recurringPattern = await this._findRecurringPatterns(userId);
      if (recurringPattern) suggestions.push(recurringPattern);

      // Strategy 2: Department-common tasks
      const deptCommonTask = await this._findDepartmentCommonTasks(user.department, userId);
      if (deptCommonTask) suggestions.push(deptCommonTask);

      // Strategy 3: Based on user's completed tasks
      const progressBasedTask = await this._suggestBasedOnProgress(userId);
      if (progressBasedTask) suggestions.push(progressBasedTask);

      // Strategy 4: Overdue prevention suggestions
      const overduePreventionTask = await this._suggestOverduePreventionTasks(userId);
      if (overduePreventionTask) suggestions.push(overduePreventionTask);

      // Strategy 5: Task continuation (related to recent tasks)
      const continuationTask = await this._findTaskContinuation(userId);
      if (continuationTask) suggestions.push(...continuationTask);

      // Score and sort suggestions
      const scoredSuggestions = await Promise.all(
        suggestions.map(async (suggestion) => ({
          ...suggestion,
          score: await this._scoreSuggestion(suggestion, { userId, department: user.department })
        }))
      );

      return scoredSuggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((s) => {
          delete s.score; // Remove score from output
          return s;
        });
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Strategy 1: Find recurring task patterns
   * E.g., "You filed a report last Monday, and the Monday before that..."
   */
  async _findRecurringPatterns(userId) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const recentTasks = await Task.find({
        createdBy: userId,
        createdAt: { $gte: thirtyDaysAgo }
      })
        .select('title createdAt tags category')
        .sort({ createdAt: -1 })
        .limit(50);

      if (recentTasks.length < 3) return null;

      // Group by title similarity
      const titleGroups = {};
      recentTasks.forEach((task) => {
        const normalizedTitle = task.title
          .toLowerCase()
          .replace(/\d+/g, '') // Remove numbers
          .replace(/\s+/g, ' ')
          .trim();

        if (!titleGroups[normalizedTitle]) {
          titleGroups[normalizedTitle] = [];
        }
        titleGroups[normalizedTitle].push(task);
      });

      // Find recurring patterns (appears 2+ times)
      for (const [title, tasks] of Object.entries(titleGroups)) {
        if (tasks.length >= 2) {
          // Calculate interval
          const dates = tasks.map((t) => t.createdAt.getTime());
          const intervals = [];
          for (let i = 1; i < dates.length; i++) {
            intervals.push(dates[i - 1] - dates[i]);
          }
          const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
          const avgDaysBetween = Math.round(avgInterval / (24 * 60 * 60 * 1000));

          // If pattern repeats every 7 days (weekly) or 30 days (monthly)
          if ((avgDaysBetween >= 5 && avgDaysBetween <= 9) || (avgDaysBetween >= 26 && avgDaysBetween <= 34)) {
            return {
              type: 'recurring-pattern',
              title: tasks[0].title,
              confidence: Math.min(0.5 + tasks.length * 0.1, 0.95),
              reason: `You ${tasks[0].title.toLowerCase()} regularly (every ${avgDaysBetween} days)`,
              suggestedTask: {
                title: tasks[0].title,
                description: `Recurring task: ${tasks[0].title}`,
                priority: tasks[0]?.priority || 'medium',
                estimatedHours: 2,
                tags: [...(tasks[0]?.tags || []), 'recurring'],
                isAIGenerated: true,
                aiConfidence: 0.75
              }
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding recurring patterns:', error);
      return null;
    }
  }

  /**
   * Strategy 2: Find common tasks in user's department
   */
  async _findDepartmentCommonTasks(departmentId, userId) {
    try {
      if (!departmentId) return null;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Find most common tasks in department (excluding user's own)
      const commonTasks = await Task.aggregate([
        {
          $match: {
            department: departmentId,
            createdBy: { $ne: userId },
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$title',
            count: { $sum: 1 },
            priority: { $first: '$priority' },
            sample: { $first: '$$ROOT' }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 1
        }
      ]);

      if (commonTasks.length === 0) return null;

      const task = commonTasks[0];
      // Only suggest if more than 2 people did this
      if (task.count < 2) return null;

      return {
        type: 'department-common',
        title: task._id,
        confidence: Math.min(0.4 + (task.count * 0.1) / 10, 0.85),
        reason: `${task.count} team members recently worked on this`,
        suggestedTask: {
          title: task._id,
          description: `Common task in your department: ${task._id}`,
          priority: task.priority || 'medium',
          estimatedHours: 3,
          tags: ['team-pattern', 'department-task'],
          isAIGenerated: true,
          aiConfidence: 0.7
        }
      };
    } catch (error) {
      console.error('Error finding department common tasks:', error);
      return null;
    }
  }

  /**
   * Strategy 3: Suggest based on progress (follow-up tasks)
   */
  async _suggestBasedOnProgress(userId) {
    try {
      // Get most recently completed task
      const lastCompleted = await Task.findOne({ createdBy: userId, status: 'completed' })
        .sort({ completedAt: -1 })
        .select('title tags priority category description');

      if (!lastCompleted) return null;

      // Suggest related follow-up task
      const followUpKeywords = {
        'report': 'Send report to stakeholders',
        'review': 'Document review findings',
        'development': 'Create unit tests',
        'project': 'Update project timeline',
        'documentation': 'Share documentation with team',
        'testing': 'Deploy to production',
        'deployment': 'Monitor deployment metrics'
      };

      let suggestion = null;

      for (const [keyword, followUp] of Object.entries(followUpKeywords)) {
        if (lastCompleted.title.toLowerCase().includes(keyword)) {
          suggestion = followUp;
          break;
        }
      }

      if (!suggestion) return null;

      return {
        type: 'progress-based',
        title: suggestion,
        confidence: 0.65,
        reason: `Follow-up to your recent task: "${lastCompleted.title}"`,
        suggestedTask: {
          title: suggestion,
          description: `Follow-up to: ${lastCompleted.title}`,
          priority: 'medium',
          estimatedHours: 2,
          tags: (lastCompleted.tags || []).concat(['follow-up']),
          isAIGenerated: true,
          aiConfidence: 0.68
        }
      };
    } catch (error) {
      console.error('Error suggesting based on progress:', error);
      return null;
    }
  }

  /**
   * Strategy 4: Suggest overdue prevention tasks
   */
  async _suggestOverduePreventionTasks(userId) {
    try {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const pendingOverdue = await Task.find({
        assignedTo: userId,
        status: { $in: ['pending', 'in-progress'] },
        dueDate: { $lt: tomorrow }
      })
        .sort({ dueDate: 1 })
        .limit(1);

      if (pendingOverdue.length === 0) return null;

      const task = pendingOverdue[0];

      return {
        type: 'overdue-prevention',
        title: `Review: ${task.title}`,
        confidence: 0.92,
        reason: 'Task due soon - consider prioritizing or asking for help',
        suggestedTask: {
          title: `Review: ${task.title}`,
          description: `This task (${task.title}) is due in 1 day. Consider prioritizing or requesting additional support.`,
          priority: 'high',
          estimatedHours: 1,
          tags: ['urgent', 'overdue-prevention'],
          isAIGenerated: true,
          aiConfidence: 0.85
        }
      };
    } catch (error) {
      console.error('Error suggesting overdue prevention tasks:', error);
      return null;
    }
  }

  /**
   * Strategy 5: Find task continuation opportunities
   */
  async _findTaskContinuation(userId) {
    try {
      const suggestions = [];

      // Find tasks with similar categories that user hasn't created yet
      const userCategories = await Task.distinct('category', {
        createdBy: userId,
        category: { $exists: true, $ne: null }
      });

      if (userCategories.length === 0) return suggestions;

      // Find common tasks in these categories from other users
      const relatedTasks = await Task.aggregate([
        {
          $match: {
            category: { $in: userCategories },
            createdBy: { $ne: userId },
            status: 'completed',
            completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: '$category',
            taskTitle: { $first: '$title' },
            count: { $sum: 1 }
          }
        },
        {
          $limit: 2
        }
      ]);

      relatedTasks.forEach((item) => {
        suggestions.push({
          type: 'task-continuation',
          title: item.taskTitle,
          confidence: 0.55,
          reason: `Similar to tasks you regularly complete`,
          suggestedTask: {
            title: item.taskTitle,
            description: `Task related to your recent work`,
            priority: 'medium',
            estimatedHours: 2,
            tags: [`category-${item._id}`, 'continuation'],
            isAIGenerated: true,
            aiConfidence: 0.65
          }
        });
      });

      return suggestions;
    } catch (error) {
      console.error('Error finding task continuation:', error);
      return [];
    }
  }

  /**
   * Score suggestion for relevance and personalization
   */
  async _scoreSuggestion(suggestion, userData) {
    let score = suggestion.confidence || 0.5;

    // Boost score if user is not overloaded
    const pendingCount = await Task.countDocuments({
      assignedTo: userData.userId,
      status: { $in: ['pending', 'in-progress'] }
    });

    if (pendingCount < 5) score += 0.15; // User has capacity
    else if (pendingCount > 15) score -= 0.2; // User is overloaded

    // Check user preference (if available)
    const userPref = await User.findById(userData.userId).select('preferences');
    if (userPref?.preferences?.autoTaskGeneration === false) {
      score *= 0.5; // Lower score if user disabled auto suggestions
    }

    return Math.min(Math.max(score, 0), 1.0);
  }

  /**
   * Get suggestions by type/category
   */
  async getSuggestionsByType(userId, type) {
    const allSuggestions = await this.generateSuggestions(userId, 10);
    return allSuggestions.filter((s) => s.type === type);
  }

  /**
   * Accept suggestion and create task from it
   */
  async acceptSuggestion(userId, suggestion, taskDefaults = {}) {
    const taskData = {
      ...suggestion.suggestedTask,
      ...taskDefaults,
      createdBy: userId,
      aiMetadata: {
        sourceType: 'suggestion',
        suggestionType: suggestion.type,
        originalReason: suggestion.reason
      }
    };

    return taskData;
  }
}

export default new TaskSuggestionService();
