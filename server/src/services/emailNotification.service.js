import nodemailer from "nodemailer";

// Initialize email transporter using environment variables
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Email templates for different notification types
const emailTemplates = {
  "task-assigned": (taskData) => ({
    subject: `New Task Assigned: ${taskData.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <h2 style="color: #333;">You Have Been Assigned a New Task</h2>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <p><strong>Task Title:</strong> ${taskData.title}</p>
          <p><strong>Description:</strong> ${taskData.description || "No description provided"}</p>
          <p><strong>Priority:</strong> <span style="padding: 4px 8px; border-radius: 4px; background-color: ${getPriorityColor(taskData.priority)}; color: white;">${taskData.priority}</span></p>
          <p><strong>Due Date:</strong> ${new Date(taskData.dueDate).toLocaleDateString()}</p>
          <p><strong>Assigned By:</strong> ${taskData.assignedByName}</p>
        </div>
        <div style="margin: 20px 0;">
          <a href="${process.env.APP_URL}/tasks/${taskData.taskId}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Task</a>
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from your HRMS Task Management System.</p>
      </div>
    `
  }),

  "task-completed": (taskData) => ({
    subject: `Task Completed: ${taskData.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <h2 style="color: #333;">Task Has Been Completed</h2>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p><strong>Task Title:</strong> ${taskData.title}</p>
          <p><strong>Completed By:</strong> ${taskData.completedByName}</p>
          <p><strong>Completion Time:</strong> ${new Date().toLocaleString()}</p>
          <p style="color: #10b981;"><strong>Status: COMPLETED ✓</strong></p>
        </div>
        <div style="margin: 20px 0;">
          <a href="${process.env.APP_URL}/tasks/${taskData.taskId}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Task</a>
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from your HRMS Task Management System.</p>
      </div>
    `
  }),

  "task-due-reminder": (taskData) => ({
    subject: `Reminder: ${taskData.title} is Due Soon`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <h2 style="color: #333;">Task Due Reminder</h2>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p><strong>Task Title:</strong> ${taskData.title}</p>
          <p><strong>Due Date:</strong> ${new Date(taskData.dueDate).toLocaleDateString()} at ${new Date(taskData.dueDate).toLocaleTimeString()}</p>
          <p><strong>Priority:</strong> <span style="padding: 4px 8px; border-radius: 4px; background-color: ${getPriorityColor(taskData.priority)}; color: white;">${taskData.priority}</span></p>
          <p><strong>Time Until Due:</strong> ${getTimeUntilDue(taskData.dueDate)}</p>
        </div>
        <div style="margin: 20px 0;">
          <a href="${process.env.APP_URL}/tasks/${taskData.taskId}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Complete Task</a>
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from your HRMS Task Management System.</p>
      </div>
    `
  }),

  "task-overdue": (taskData) => ({
    subject: `⚠️ URGENT: Task Overdue - ${taskData.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <h2 style="color: #dc2626;">⚠️ Task Overdue</h2>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p><strong>Task Title:</strong> ${taskData.title}</p>
          <p><strong>Original Due Date:</strong> ${new Date(taskData.dueDate).toLocaleDateString()}</p>
          <p><strong>Days Overdue:</strong> <span style="color: #dc2626; font-weight: bold;">${getDaysOverdue(taskData.dueDate)} days</span></p>
          <p><strong>Status:</strong> <span style="padding: 4px 8px; border-radius: 4px; background-color: #dc2626; color: white;">OVERDUE</span></p>
        </div>
        <div style="margin: 20px 0;">
          <a href="${process.env.APP_URL}/tasks/${taskData.taskId}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Complete Task Now</a>
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from your HRMS Task Management System.</p>
      </div>
    `
  }),

  "task-accepted": (taskData) => ({
    subject: `Task Accepted: ${taskData.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <h2 style="color: #333;">Task Accepted</h2>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p><strong>Task Title:</strong> ${taskData.title}</p>
          <p><strong>Accepted By:</strong> ${taskData.acceptedByName}</p>
          <p><strong>Acceptance Time:</strong> ${new Date().toLocaleString()}</p>
          <p style="color: #10b981;"><strong>Status: ACCEPTED ✓</strong></p>
        </div>
        <div style="margin: 20px 0;">
          <a href="${process.env.APP_URL}/tasks/${taskData.taskId}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Task</a>
        </div>
      </div>
    `
  }),

  "task-rejected": (taskData) => ({
    subject: `Task Rejected: ${taskData.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <h2 style="color: #333;">Task Has Been Rejected</h2>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p><strong>Task Title:</strong> ${taskData.title}</p>
          <p><strong>Rejected By:</strong> ${taskData.rejectedByName}</p>
          <p><strong>Rejection Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Reason:</strong> ${taskData.rejectionReason || "No reason provided"}</p>
          <p style="color: #ef4444;"><strong>Status: REJECTED</strong></p>
        </div>
        <div style="margin: 20px 0;">
          <a href="${process.env.APP_URL}/tasks/${taskData.taskId}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Task</a>
        </div>
      </div>
    `
  }),

  "task-reassigned": (taskData) => ({
    subject: `Task Reassigned: ${taskData.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <h2 style="color: #333;">Task Has Been Reassigned</h2>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
          <p><strong>Task Title:</strong> ${taskData.title}</p>
          <p><strong>Assigned To:</strong> ${taskData.assignedToName}</p>
          <p><strong>Reassigned By:</strong> ${taskData.reassignedByName}</p>
          <p><strong>Due Date:</strong> ${new Date(taskData.dueDate).toLocaleDateString()}</p>
        </div>
        <div style="margin: 20px 0;">
          <a href="${process.env.APP_URL}/tasks/${taskData.taskId}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Task</a>
        </div>
      </div>
    `
  }),

  "task-forwarded": (taskData) => ({
    subject: `Task Forwarded: ${taskData.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <h2 style="color: #333;">Task Has Been Forwarded</h2>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
          <p><strong>Task Title:</strong> ${taskData.title}</p>
          <p><strong>Forwarded To:</strong> ${taskData.forwardedToName}</p>
          <p><strong>Forwarded By:</strong> ${taskData.forwardedByName}</p>
          <p><strong>Forwarding Reason:</strong> ${taskData.forwardingReason || "Task forwarded"}</p>
          <p><strong>Due Date:</strong> ${new Date(taskData.dueDate).toLocaleDateString()}</p>
        </div>
        <div style="margin: 20px 0;">
          <a href="${process.env.APP_URL}/tasks/${taskData.taskId}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Task</a>
        </div>
      </div>
    `
  })
};

// Helper function to get priority color
function getPriorityColor(priority) {
  const colors = {
    "critical": "#dc2626",
    "high": "#f59e0b",
    "medium": "#3b82f6",
    "low": "#10b981"
  };
  return colors[priority?.toLowerCase()] || "#6b7280";
}

// Helper function to calculate time until due
function getTimeUntilDue(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due - now;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${(hours % 24) !== 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}

// Helper function to calculate days overdue
function getDaysOverdue(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = now - due;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Send email notification for task events
 * @param {string} recipientEmail - Recipient email address
 * @param {string} notificationType - Type of notification (task-assigned, task-completed, etc.)
 * @param {object} taskData - Task data including title, description, assignedBy, etc.
 * @returns {Promise<boolean>} - Returns true if email sent successfully
 */
export async function sendTaskEmail(recipientEmail, notificationType, taskData) {
  try {
    // Get email template for this notification type
    const template = emailTemplates[notificationType];
    if (!template) {
      console.warn(`No email template found for notification type: ${notificationType}`);
      return false;
    }

    // Generate email content
    const emailContent = template(taskData);

    // Send email
    const result = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'HRMS System'}" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html
    });

    console.log(`✅ Email sent to ${recipientEmail} for ${notificationType}:`, result.messageId);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${recipientEmail}:`, error.message);
    return false;
  }
}

/**
 * Verify transporter connection
 * @returns {Promise<boolean>}
 */
export async function verifyEmailService() {
  try {
    await transporter.verify();
    console.log("✅ Email service verified successfully");
    return true;
  } catch (error) {
    console.error("❌ Email service verification failed:", error.message);
    return false;
  }
}

/**
 * Send batch emails
 * @param {Array<string>} recipientEmails - Array of recipient emails
 * @param {string} notificationType - Type of notification
 * @param {object} taskData - Task data
 * @returns {Promise<object>} - Statistics about sent emails
 */
export async function sendBatchTaskEmails(recipientEmails, notificationType, taskData) {
  const results = {
    total: recipientEmails.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  for (const email of recipientEmails) {
    const success = await sendTaskEmail(email, notificationType, taskData);
    if (success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push(email);
    }
  }

  return results;
}

export default {
  sendTaskEmail,
  verifyEmailService,
  sendBatchTaskEmails
};
