import nodemailer from "nodemailer";
import { env } from "../config/env.js";

// ============================================
// Nodemailer Transporter Configuration
// ============================================

// Create reusable transporter object using SMTP transport
// Configure based on your email provider (Gmail, Outlook, SMTP, etc.)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Your email address
    pass: process.env.SMTP_PASS, // Your app password or SMTP password
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV !== "production",
  },
});

// Company email for sending emails - REQUIRED in .env
if (!process.env.COMPANY_EMAIL) {
  throw new Error("❌ COMPANY_EMAIL environment variable is required in .env");
}
if (!process.env.COMPANY_NAME) {
  throw new Error("❌ COMPANY_NAME environment variable is required in .env");
}

const COMPANY_EMAIL = process.env.COMPANY_EMAIL;
const COMPANY_NAME = process.env.COMPANY_NAME;

// ============================================
// Email Templates
// ============================================

/**
 * Email template for when a staff submits a complaint
 */
const createComplaintReceivedTemplate = (userName, subject) => ({
  subject: "Feedback Received - Under Review",
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Feedback Received</h1>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <p style="color: #334155; font-size: 16px; margin: 0 0 20px 0;">Hello <strong>${userName}</strong>,</p>
                                
                                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Thank you for your feedback/complaint. Your message is currently under survey. 
                                </p>
                                
                                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                                    <strong>Subject:</strong> ${subject}<br>
                                    You will typically receive a reply from the Admin team within <strong>7 working days</strong>.
                                </p>
                                
                                <!-- Status Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                    <tr>
                                        <td align="center">
                                            <p style="color: #64748b; font-size: 14px; margin: 0;">Current Status</p>
                                            <p style="color: #0ea5e9; font-size: 18px; font-weight: 600; margin: 8px 0 0 0;">Under Survey</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Footer -->
                                <p style="color: #94a3b8; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
                                    This is an automated message from ${COMPANY_NAME}.<br>
                                    Please do not reply directly to this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `,
  text: `Hello ${userName},\n\nThank you for your feedback/complaint. Your message is currently under survey.\n\nSubject: ${subject}\n\nYou will typically receive a reply from the Admin team within 7 working days.\n\nCurrent Status: Under Survey\n\nThis is an automated message from ${COMPANY_NAME}. Please do not reply directly to this email.`,
});

/**
 * Email template for when admin replies to a complaint
 */
const createAdminReplyTemplate = (userName, originalSubject, replyMessage, repliedByName) => ({
  subject: "Update: Response to your Feedback",
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Response to Your Feedback</h1>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <p style="color: #334155; font-size: 16px; margin: 0 0 20px 0;">Hello <strong>${userName}</strong>,</p>
                                
                                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                                    We have reviewed your feedback and here is our response:
                                </p>
                                
                                <!-- Original Subject -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
                                    <tr>
                                        <td>
                                            <p style="color: #64748b; font-size: 13px; margin: 0 0 4px 0;">Original Subject</p>
                                            <p style="color: #1e293b; font-size: 15px; font-weight: 600; margin: 0;">${originalSubject}</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Admin Reply -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                    <tr>
                                        <td>
                                            <p style="color: #059669; font-size: 13px; font-weight: 600; margin: 0 0 12px 0;">✉️ Admin Reply</p>
                                            <p style="color: #065f46; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${replyMessage}</p>
                                            <p style="color: #047857; font-size: 12px; margin: 16px 0 0 0;">— Response from: ${repliedByName}</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Status -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-radius: 8px; padding: 16px; margin: 20px 0;">
                                    <tr>
                                        <td align="center">
                                            <p style="color: #64748b; font-size: 14px; margin: 0;">Current Status</p>
                                            <p style="color: #059669; font-size: 18px; font-weight: 600; margin: 8px 0 0 0;">Resolved ✓</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Footer -->
                                <p style="color: #94a3b8; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
                                    This is an automated message from ${COMPANY_NAME}.<br>
                                    Please do not reply directly to this email.<br>
                                    If you need further assistance, please submit a new complaint through the system.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `,
  text: `Hello ${userName},\n\nWe have reviewed your feedback and here is our response:\n\nOriginal Subject: ${originalSubject}\n\nAdmin Reply:\n${replyMessage}\n\n— Response from: ${repliedByName}\n\nCurrent Status: Resolved ✓\n\nThis is an automated message from ${COMPANY_NAME}. Please do not reply directly to this email.`,
});

/**
 * Email template for welcoming new user accounts created by admin/HR
 */
const createWelcomeTemplate = (userName, userEmail, temporaryPassword, createdByName, role) => {
  const roleDisplay = role === "USER" ? "Employee" : role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  
  return {
    subject: `Welcome to ${COMPANY_NAME} - Your Account is Ready!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
              <tr>
                  <td align="center">
                      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                          <!-- Header -->
                          <tr>
                              <td style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Welcome! 🎉</h1>
                                  <p style="color: #e0f2fe; font-size: 16px; margin: 10px 0 0 0;">Your account has been successfully created</p>
                              </td>
                          </tr>
                          <!-- Content -->
                          <tr>
                              <td style="padding: 40px 30px;">
                                  <p style="color: #334155; font-size: 16px; margin: 0 0 10px 0;">Hello <strong>${userName}</strong>,</p>
                                  
                                  <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                                      Welcome to the <strong>${COMPANY_NAME}</strong> team! Your account has been successfully created by <strong>${createdByName}</strong>. You're all set to access our ERP system.
                                  </p>
                                  
                                  <!-- Account Details Box -->
                                  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; border-radius: 8px; padding: 24px; margin: 20px 0;">
                                      <tr>
                                          <td>
                                              <p style="color: #0369a1; font-size: 13px; font-weight: 600; margin: 0 0 12px 0; text-transform: uppercase;">📋 Account Information</p>
                                              
                                              <table width="100%" cellpadding="0" cellspacing="0">
                                                  <tr>
                                                      <td style="padding: 8px 0; border-bottom: 1px solid #cffafe;">
                                                          <p style="color: #64748b; font-size: 13px; margin: 0; font-weight: 600;">Email Address</p>
                                                          <p style="color: #1e293b; font-size: 15px; margin: 4px 0 0 0; word-break: break-all;">${userEmail}</p>
                                                      </td>
                                                  </tr>
                                                  <tr>
                                                      <td style="padding: 8px 0; border-bottom: 1px solid #cffafe;">
                                                          <p style="color: #64748b; font-size: 13px; margin: 0; font-weight: 600;">Temporary Password</p>
                                                          <p style="color: #1e293b; font-size: 15px; margin: 4px 0 0 0; font-family: monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 4px; border: 1px solid #bae6fd;">${temporaryPassword}</p>
                                                      </td>
                                                  </tr>
                                                  <tr>
                                                      <td style="padding: 8px 0;">
                                                          <p style="color: #64748b; font-size: 13px; margin: 0; font-weight: 600;">Account Role</p>
                                                          <p style="color: #1e293b; font-size: 15px; margin: 4px 0 0 0;"><strong>${roleDisplay}</strong></p>
                                                      </td>
                                                  </tr>
                                              </table>
                                          </td>
                                      </tr>
                                  </table>
                                  
                                  <!-- Next Steps -->
                                  <div style="background-color: #fef3c7; border: 2px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                      <p style="color: #92400e; font-size: 13px; font-weight: 600; margin: 0 0 12px 0;">⚡ IMPORTANT - Next Steps:</p>
                                      <ol style="color: #b45309; font-size: 14px; margin: 0; padding-left: 20px;">
                                          <li style="margin: 8px 0;">Log in using your email and temporary password</li>
                                          <li style="margin: 8px 0;">Change your password immediately for security</li>
                                          <li style="margin: 8px 0;">Complete your profile information</li>
                                          <li style="margin: 8px 0;">Contact your manager if you need access to specific modules</li>
                                      </ol>
                                  </div>
                                  
                                  <!-- Quick Facts -->
                                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                      <tr>
                                          <td style="background-color: #e0f7fa; border-left: 4px solid #06b6d4; padding: 12px 16px; border-radius: 4px; margin-bottom: 12px;">
                                              <p style="color: #0369a1; font-size: 13px; font-weight: 600; margin: 0;">System Access</p>
                                              <p style="color: #064e78; font-size: 13px; margin: 6px 0 0 0;">You can now access the ERP system from any device</p>
                                          </td>
                                      </tr>
                                      <tr>
                                          <td style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 4px; margin-bottom: 12px;">
                                              <p style="color: #065f46; font-size: 13px; font-weight: 600; margin: 0;">Security</p>
                                              <p style="color: #1b4332; font-size: 13px; margin: 6px 0 0 0;">This is your temporary password. Change it immediately after first login</p>
                                          </td>
                                      </tr>
                                      <tr>
                                          <td style="background-color: #fef3c7; border-left: 4px solid #fcd34d; padding: 12px 16px; border-radius: 4px;">
                                              <p style="color: #92400e; font-size: 13px; font-weight: 600; margin: 0;">Support</p>
                                              <p style="color: #b45309; font-size: 13px; margin: 6px 0 0 0;">Contact your HR team if you face any login issues</p>
                                          </td>
                                      </tr>
                                  </table>
                                  
                                  <!-- CTA Button -->
                                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                      <tr>
                                          <td align="center">
                                              <table cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); border-radius: 6px;">
                                                  <tr>
                                                      <td style="padding: 14px 40px;">
                                                          <a href="${process.env.FRONTEND_URL || 'https://your-erp-url.com'}" style="color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600;">Login to ERP System →</a>
                                                      </td>
                                                  </tr>
                                              </table>
                                          </td>
                                      </tr>
                                  </table>
                                  
                                  <!-- Footer -->
                                  <p style="color: #94a3b8; font-size: 12px; margin: 30px 0 0 0; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                      This is an automated message from ${COMPANY_NAME}.<br>
                                      If you did not request this account, please contact your HR administrator immediately.<br>
                                      <strong>Do not share your password with anyone.</strong>
                                  </p>
                              </td>
                          </tr>
                      </table>
                  </td>
              </tr>
          </table>
      </body>
      </html>
    `,
    text: `Hello ${userName},\n\nWelcome to ${COMPANY_NAME}! Your account has been successfully created by ${createdByName}.\n\n📋 ACCOUNT INFORMATION\nEmail: ${userEmail}\nTemporary Password: ${temporaryPassword}\nRole: ${roleDisplay}\n\n⚡ IMPORTANT - NEXT STEPS:\n1. Log in using your email and temporary password\n2. Change your password immediately for security\n3. Complete your profile information\n4. Contact your manager if you need access to specific modules\n\nSecurity Notice:\n- Your temporary password should be changed immediately after first login\n- This is your temporary password for initial access only\n- Do not share your password with anyone\n\nIf you have any issues, contact your HR team.\n\nThis is an automated message from ${COMPANY_NAME}. If you did not request this account, please contact your HR administrator immediately.`,
  };
};

// ============================================
// Email Sending Functions
// ============================================

/**
 * Send complaint received confirmation email to staff
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name
 * @param {string} subject - Complaint subject
 * @returns {Promise<boolean>} - Returns true if email sent successfully
 */
export async function sendComplaintReceivedEmail(userEmail, userName, subject) {
  const template = createComplaintReceivedTemplate(userName, subject);

  try {
    const info = await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${COMPANY_EMAIL}>`,
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log(`✅ Complaint confirmation email sent to ${userEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send complaint confirmation email to ${userEmail}:`, error.message);
    // Log email error separately as per requirements
    console.error("[EMAIL_ERROR] Complaint confirmation email failed:", {
      recipient: userEmail,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

/**
 * Send welcome/greeting email to newly created user
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's full name
 * @param {string} temporaryPassword - Temporary password for initial login
 * @param {string} createdByName - Name of admin/HR who created the account
 * @param {string} role - User role (USER, HR, ADMIN, etc.)
 * @returns {Promise<boolean>} - Returns true if email sent successfully
 */
export async function sendWelcomeEmail(
  userEmail,
  userName,
  temporaryPassword,
  createdByName,
  role
) {
  const template = createWelcomeTemplate(
    userName,
    userEmail,
    temporaryPassword,
    createdByName,
    role
  );

  try {
    const info = await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${COMPANY_EMAIL}>`,
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log(`✅ Welcome email sent to ${userEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${userEmail}:`, error.message);
    // Log email error separately as per requirements
    console.error("[EMAIL_ERROR] Welcome email failed:", {
      recipient: userEmail,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

/**
 * Send admin reply notification email to staff
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name
 * @param {string} originalSubject - Original complaint subject
 * @param {string} replyMessage - Admin's reply message
 * @param {string} repliedByName - Name of admin who replied
 * @returns {Promise<boolean>} - Returns true if email sent successfully
 */
export async function sendAdminReplyEmail(
  userEmail,
  userName,
  originalSubject,
  replyMessage,
  repliedByName
) {
  const template = createAdminReplyTemplate(
    userName,
    originalSubject,
    replyMessage,
    repliedByName
  );

  try {
    const info = await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${COMPANY_EMAIL}>`,
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log(`✅ Admin reply email sent to ${userEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send admin reply email to ${userEmail}:`, error.message);
    // Log email error separately as per requirements
    console.error("[EMAIL_ERROR] Admin reply email failed:", {
      recipient: userEmail,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

/**
 * Verify email transporter connection
 * Useful for testing configuration
 */
export async function verifyTransporter() {
  try {
    await transporter.verify();
    console.log("✅ Email transporter is ready");
    return true;
  } catch (error) {
    console.error("❌ Email transporter verification failed:", error.message);
    return false;
  }
}

export default {
  sendComplaintReceivedEmail,
  sendAdminReplyEmail,
  sendWelcomeEmail,
  verifyTransporter,
};

