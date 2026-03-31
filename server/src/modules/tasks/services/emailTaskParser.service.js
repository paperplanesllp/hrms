/**
 * Email Task Parser Service
 * Extracts task information from email subjects and bodies
 * Handles different email formats and conventions
 */

import AITaskGeneratorService from './aiTaskGenerator.service.js';

class EmailTaskParserService {
  /**
   * Parse email subject for task information
   * Patterns: "[URGENT] Review Report", "FW: Complete Documentation", "TODO: Update Database"
   */
  parseEmailSubject(subject) {
    if (!subject || subject.trim().length === 0) {
      return null;
    }

    const result = {
      title: subject.trim(),
      priority: 'medium',
      tags: []
    };

    // Remove common email prefixes
    result.title = result.title
      .replace(/^(FW|RE|FWD|RE-FWD):\s*/i, '')
      .replace(/\[no subject\]/i, 'Task from Email');

    // Extract priority from brackets or keywords
    const priorityMatch = result.title.match(/\[(URGENT|HIGH|IMPORTANT|LOW|MEDIUM)\]/i);
    if (priorityMatch) {
      const p = priorityMatch[1].toLowerCase();
      result.priority = p === 'urgent' ? 'high' : p === 'important' ? 'high' : p;
      result.title = result.title.replace(priorityMatch[0], '').trim();
      result.tags.push(p.toLowerCase());
    }

    // Extract TODO/FIX/REVIEW/etc tags
    const tags = ['TODO', 'FIXME', 'BUG', 'REVIEW', 'APPROVE', 'WAITING', 'BLOCKED'];
    tags.forEach((tag) => {
      if (new RegExp(`\\b${tag}\\b`, 'i').test(result.title)) {
        result.tags.push(tag.toLowerCase());
        // Remove tag from title for cleaner display
        // Optional - keep as is if you want tags to remain in title
      }
    });

    return result;
  }

  /**
   * Parse email body for task details
   */
  parseEmailBody(body) {
    if (!body || body.trim().length === 0) {
      return { description: '', actionItems: [], deadline: null };
    }

    // Remove email signatures (common patterns)
    let cleanBody = body
      .replace(/---+[\s\S]*?(?:Best regards|Regards|Thanks|--Regards|Sent from)/i, '')
      .replace(/\.{3}[\s\S]*?$/i, '') // Ellipsis to end
      .trim();

    // Extract deadline from body
    const deadline = AITaskGeneratorService.parseDeadline(cleanBody);

    // Extract action items using AI service
    const actionItems = AITaskGeneratorService.detectActionItems(cleanBody);

    // Get main description (first paragraph)
    const lines = cleanBody.split('\n').filter((line) => line.trim().length > 0);
    const description = lines.slice(0, 3).join(' ').substring(0, 500);

    return {
      description: description || cleanBody.substring(0, 500),
      actionItems,
      deadline
    };
  }

  /**
   * Extract all task-related information from an email
   */
  extractTaskFromEmail(emailData) {
    const { subject = '', body = '', from = '', receivedDate = new Date() } = emailData;

    // Parse subject
    const subjectParsed = this.parseEmailSubject(subject);
    if (!subjectParsed) {
      throw new Error('Invalid email subject');
    }

    // Parse body
    const bodyParsed = this.parseEmailBody(body);

    // Extract full body content (capped at 2000 chars for description)
    const fullDescription = bodyParsed.description || `Email from: ${from}\n${subject}`;

    // Auto-detect assignee from email sender
    const senderEmail = from?.match(/[^\s<]+@[^\s>]+/)?.[0];

    // Combine results
    const taskData = {
      title: subjectParsed.title || 'Task from Email',
      description: fullDescription,
      priority: subjectParsed.priority,
      tags: [...subjectParsed.tags, 'email-sourced'],
      isAIGenerated: true,
      aiConfidence: 0.75,
      status: 'new',
      dueDate: bodyParsed.deadline,
      progressPercentage: 0,

      // Email-specific metadata
      aiMetadata: {
        sourceType: 'email',
        fromEmail: senderEmail,
        receivedDate: receivedDate,
        originalSubject: subject,
        actionItems: bodyParsed.actionItems
      },

      attachments: emailData.attachments?.map((att) => ({
        name: att.name,
        url: att.url,
        mimeType: att.mimeType
      })) || []
    };

    return taskData;
  }

  /**
   * Generate subtasks from email action items
   */
  generateSubtasksFromEmail(emailBody, emailTitle) {
    const actionItems = AITaskGeneratorService.detectActionItems(`${emailTitle}. ${emailBody}`);

    return actionItems.map((item, index) => ({
      title: item.substring(0, 100),
      description: '',
      status: 'pending',
      order: index + 1,
      isAIGenerated: true,
      aiConfidence: 0.8
    }));
  }

  /**
   * Check if email content looks like a task request
   */
  isTaskEmail(subject, body) {
    const taskKeywords = /task|action|todo|deadline|due|complete|finish|urgent|asap|review|approve|submit|deliver|check|verify/i;
    const assignmentKeywords = /(?:assigned to|please|can you|need|required to|will you|don't forget)/i;

    return taskKeywords.test(subject) || taskKeywords.test(body) || assignmentKeywords.test(body);
  }

  /**
   * Calculate email task urgency
   */
  calculateEmailUrgency(subject, body) {
    const urgencyKeywords = {
      critical: /(?:critical|emergency|urgent|immediately|asap|right now|critical path)/i,
      high: /(?:high priority|important|this week|today|tomorrow|asap)/i,
      medium: /(?:medium|normal|next week|soon)/i,
      low: /(?:low priority|not urgent|when possible|backlog|eventually)/i
    };

    const combined = `${subject} ${body}`;

    if (urgencyKeywords.critical.test(combined)) return 'high'; // Treat critical as high
    if (urgencyKeywords.high.test(combined)) return 'high';
    if (urgencyKeywords.low.test(combined)) return 'low';

    return 'medium';
  }

  /**
   * Validate extracted task has minimum required fields
   */
  validateExtractedTask(task) {
    const errors = [];

    if (!task.title || task.title.trim().length === 0) {
      errors.push('Task title is required');
    }

    if (task.title && task.title.length > 200) {
      errors.push('Task title exceeds 200 characters');
    }

    if (task.priority && !['low', 'medium', 'high'].includes(task.priority)) {
      errors.push('Invalid priority value');
    }

    if (task.dueDate && isNaN(new Date(task.dueDate).getTime())) {
      errors.push('Invalid deadline date');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format email task for display/preview before creation
   */
  formatEmailTaskPreview(taskData) {
    return {
      title: taskData.title,
      priority: taskData.priority,
      description: taskData.description?.substring(0, 200) + (taskData.description?.length > 200 ? '...' : ''),
      deadline: taskData.dueDate?.toLocaleDateString?.(),
      source: taskData.aiMetadata?.fromEmail,
      actionItems: taskData.aiMetadata?.actionItems?.slice(0, 3)
    };
  }
}

export default new EmailTaskParserService();
