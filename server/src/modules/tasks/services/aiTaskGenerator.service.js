/**
 * AI Task Generator Service
 * Parses natural language text to generate structured tasks
 * Supports meeting notes, emails, and freeform task descriptions
 */

import Task from './Task.model.js';
import SubTask from './SubTask.model.js';
import User from '../users/User.model.js';

class AITaskGeneratorService {
  /**
   * Parse assignee from text
   * Matches patterns like: "John will", "assigned to Ahmed", "task for Sarah"
   */
  parseAssignee(text, departmentUsers = []) {
    const patterns = [
      /(?:assigned to|assign to)\s+([A-Za-z\s]+?)(?:\.|,|$)/i,
      /(?:task for|work for)\s+([A-Za-z\s]+?)(?:\.|,|$)/i,
      /([A-Za-z]+)\s+(?:will|should|needs to)\s+/i,
      /(?:@|mention)\s*([A-Za-z\s]+?)(?:\.|,|$)/i,
      /(?:john|ahmed|sarah|smith|doe|khan)\b/i // Common names fallback
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().toLowerCase();
      }
    }
    return null;
  }

  /**
   * Parse deadline from text
   * Matches: "by Friday", "due tomorrow", "in 3 days", specific dates
   */
  parseDeadline(text) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Relative patterns
    const relativePatterns = [
      { pattern: /\btoday\b/i, days: 0 },
      { pattern: /\btomorrow\b/i, days: 1 },
      { pattern: /\bnext\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, days: 7 },
      { pattern: /\bthis\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, days: 0 },
      { pattern: /\bin\s+(\d+)\s+days?\b/i, days: (match) => parseInt(match[1]) },
      { pattern: /\bby\s+(?:next\s+)?([A-Za-z]+day)/i, days: (match) => this._dayToDeadline(match[1]) }
    ];

    for (const { pattern, days } of relativePatterns) {
      const match = text.match(pattern);
      if (match) {
        const daysToAdd = typeof days === 'function' ? days(match) : days;
        if (daysToAdd !== null) {
          const deadline = new Date(today);
          deadline.setDate(deadline.getDate() + daysToAdd);
          return deadline;
        }
      }
    }

    // Absolute date patterns (DD/MM/YYYY, MM-DD-YYYY, etc.)
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const date = new Date(match[0]);
          if (!isNaN(date.getTime())) {
            return date;
          }
        } catch (e) {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Helper: Convert day name to deadline
   */
  _dayToDeadline(dayName) {
    const days = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 0
    };

    const dayLower = dayName.toLowerCase().slice(0, -3); // Remove "day"
    const target = days[dayLower];
    if (target === undefined) return null;

    const today = new Date();
    const currentDay = today.getDay();
    let daysUntil = (target - currentDay + 7) % 7;

    // If today is target day and it's afternoon, schedule for next week
    const currentHour = today.getHours();
    if (daysUntil === 0 && currentHour >= 12) {
      daysUntil = 7;
    }

    return daysUntil === 0 ? 7 : daysUntil;
  }

  /**
   * Detect priority from text keywords
   */
  detectPriority(text) {
    const lowPriority = /\b(?:low priority|minor|can wait|backlog)\b/i;
    const mediumPriority = /\b(?:medium|normal|regular|standard)\b/i;
    const highPriority = /\b(?:high|urgent|asap|immediately|critical|emergency|urgent)\b/i;

    if (highPriority.test(text)) return 'high';
    if (lowPriority.test(text)) return 'low';
    if (mediumPriority.test(text)) return 'medium';

    return 'medium'; // Default
  }

  /**
   * Extract action items from text
   * Splits by sentences and filters for actionable items
   */
  detectActionItems(text) {
    // Split by common delimiters
    const sentences = text
      .split(/[.\n•\-*]/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 10 && s.length < 500);

    // Filter for action items (start with verbs or contain action keywords)
    const actionVerbs = /^(?:create|update|review|prepare|finish|send|write|develop|implement|test|fix|close|resolve|complete|check|verify|validate|approve|schedule|organize|plan|design|analyze|process)/i;
    const actionKeywords = /(?:need|must|should|will|require|have to|has to|don't forget|remember to|make sure|ensure all|complete|finish|done by)/i;

    return sentences
      .filter((s) => actionVerbs.test(s) || actionKeywords.test(s))
      .map((s) => s.replace(/^[A-Z][a-z]+\s+(?:should|needs?|must)\s+/i, '').trim())
      .slice(0, 15); // Limit to 15 action items
  }

  /**
   * Generate confidence score for AI-generated task
   */
  calculateConfidence(parseResults) {
    let confidence = 0.5; // Base score

    if (parseResults.assignee) confidence += 0.15;
    if (parseResults.deadline) confidence += 0.15;
    if (parseResults.priority !== 'medium') confidence += 0.1;
    if (parseResults.title && parseResults.title.length > 20) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Main function: Parse text and generate tasks
   * @param {string} text - Raw text input (meeting notes, email, etc.)
   * @param {Object} options - { departmentUsers, createdBy, departmentId }
   * @returns {Array} Array of structured tasks
   */
  async generateTasksFromText(text, options = {}) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text input cannot be empty');
    }

    const { departmentUsers = [], createdBy, departmentId } = options;
    const actionItems = this.detectActionItems(text);

    if (actionItems.length === 0) {
      throw new Error('No actionable items detected in text');
    }

    const generatedTasks = await Promise.all(
      actionItems.map(async (item, index) => {
        const deadline = this.parseDeadline(item) || this.parseDeadline(text);
        const assigneeName = this.parseAssignee(item);
        let assigneeId = null;

        // Find matching user if assignee name detected
        if (assigneeName) {
          const user = await User.findOne({
            $or: [
              { firstName: new RegExp(assigneeName, 'i') },
              { lastName: new RegExp(assigneeName, 'i') },
              { email: new RegExp(assigneeName, 'i') }
            ]
          });
          assigneeId = user?._id;
        }

        const priority = this.detectPriority(item + ' ' + text);
        const parseResults = {
          title: item.substring(0, 100),
          assignee: assigneeName,
          deadline,
          priority
        };

        return {
          title: item.substring(0, 100),
          description: `AI-generated from: ${text.substring(0, 200)}...`,
          assignedTo: assigneeId,
          dueDate: deadline,
          priority,
          status: 'new',
          isAIGenerated: true,
          aiConfidence: this.calculateConfidence(parseResults),
          progressPercentage: 0,
          department: departmentId,
          createdBy,
          tags: ['ai-generated', 'meeting-notes'],
          // Metadata for later refinement
          aiMetadata: {
            detectedAssignee: assigneeName,
            sourceType: 'text-parsing',
            originalText: item,
            confidenceFactors: {
              hasAssignee: !!assigneeId,
              hasDeadline: !!deadline,
              priorityDetected: priority !== 'medium'
            }
          }
        };
      })
    );

    return generatedTasks;
  }

  /**
   * Predict task deadline based on similar historical tasks
   */
  async predictDeadline(taskTitle, department, assignedTo) {
    try {
      // Find similar recently completed tasks
      const similarTasks = await Task.find({
        department,
        status: 'completed',
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // Last 90 days
        title: new RegExp(taskTitle.split(' ').slice(0, 3).join('|'), 'i')
      })
        .select('dueDate completedAt')
        .limit(10);

      if (similarTasks.length === 0) {
        // Default: 3 days from now
        const date = new Date();
        date.setDate(date.getDate() + 3);
        return { deadline: date, confidence: 0.3, reasoning: 'Default estimate (3 days)' };
      }

      // Calculate average completion time
      const avgCompletionTime = similarTasks.reduce((sum, task) => {
        const time = (task.completedAt - task.dueDate) / (1000 * 60 * 60 * 24); // Days
        return sum + Math.max(time, 0);
      }, 0) / similarTasks.length;

      const suggestedDeadline = new Date();
      suggestedDeadline.setDate(suggestedDeadline.getDate() + Math.ceiling(avgCompletionTime + 1));

      return {
        deadline: suggestedDeadline,
        confidence: Math.min(0.3 + similarTasks.length * 0.05, 0.9),
        reasoning: `Based on ${similarTasks.length} similar tasks (avg ${avgCompletionTime.toFixed(1)} days)`
      };
    } catch (error) {
      console.error('Error predicting deadline:', error);
      return null;
    }
  }

  /**
   * Break down task into subtasks using AI
   */
  async breakdownTaskIntoSubtasks(task, maxSubtasks = 5) {
    const breakdown = `${task.title}. ${task.description || ''}`;
    const actionItems = this.detectActionItems(breakdown);

    if (actionItems.length <= 1) {
      return []; // Too simple to break down
    }

    const subtasks = actionItems.slice(0, maxSubtasks).map((item, index) => ({
      title: item.substring(0, 100),
      description: '',
      status: 'pending',
      order: index + 1,
      isAIGenerated: true,
      aiConfidence: 0.7,
      estimatedHours: Math.ceil(task.estimatedHours / actionItems.length)
    }));

    return subtasks;
  }

  /**
   * Score task suggestion for relevance
   */
  async scoreSuggestion(suggestion, userData) {
    let score = 0.5;

    // Check if similar to user's past tasks
    const pastTasks = await Task.find({ createdBy: userData.userId })
      .select('tags category')
      .limit(20);

    const suggestionTags = suggestion.tags || [];
    const userTags = new Set(pastTasks.flatMap((t) => t.tags || []));

    const matchingTags = suggestionTags.filter((tag) => userTags.has(tag)).length;
    score += (matchingTags / Math.max(suggestionTags.length, 1)) * 0.3;

    // Check relevance to user's current workload
    const pendingCount = await Task.countDocuments({
      assignedTo: userData.userId,
      status: { $in: ['pending', 'in-progress'] }
    });

    if (pendingCount < 5) score += 0.2; // User has capacity
    else if (pendingCount > 15) score -= 0.1; // User is overloaded

    return Math.min(Math.max(score, 0), 1.0);
  }
}

export default new AITaskGeneratorService();
