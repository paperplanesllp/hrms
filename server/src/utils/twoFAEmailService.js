import nodemailer from "nodemailer";
import { ApiError } from "./apiError.js";
import { StatusCodes } from "http-status-codes";

/**
 * Get mail configuration from environment variables
 */
function getMailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS"
    );
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV !== "production",
    },
  };
}

/**
 * Build 2FA OTP email template
 * @param {object} params - Email parameters
 * @param {string} params.otp - 6-digit OTP
 * @param {string} params.name - User name
 * @param {number} params.expiryMinutes - OTP expiry in minutes
 * @param {string} params.context - Either 'login' or 'disable'
 * @returns {object} Email template with subject and HTML
 */
function build2FAOTPTemplate({ otp, name = "User", expiryMinutes = 5, context = "login" }) {
  const companyName = process.env.COMPANY_NAME || "HRMS";
  const isLoginContext = context === "login";

  const title = isLoginContext
    ? "Your Two-Factor Authentication Code"
    : "Verification Code to Disable 2FA";

  const description = isLoginContext
    ? "Your OTP for secure login is:"
    : "Confirm disabling Two-Factor Authentication with this code:";

  const instruction = isLoginContext
    ? `This OTP is valid for ${expiryMinutes} minutes and is intended for login only.`
    : `This OTP is valid for ${expiryMinutes} minutes and is for disabling 2FA only.`;

  const warning = isLoginContext
    ? "Do not share this OTP with anyone."
    : "Never share this code. We will never ask for it.";

  return {
    subject: `${companyName} - ${title}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
            🔐 ${title}
          </h1>
        </div>

        <!-- Content -->
        <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 20px 0; font-size: 16px;">Hello ${name},</p>
          
          <p style="margin: 0 0 20px 0; color: #4b5563;">
            ${description}
          </p>

          <!-- OTP Code -->
          <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
            <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 12px;">
              ${instruction}
            </p>
          </div>

          <!-- Important Notes -->
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-weight: 500;">
              ⚠️ ${warning}
            </p>
          </div>

          <!-- Additional Info -->
          <div style="background-color: #e0e7ff; border-left: 4px solid #667eea; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #3730a3; font-size: 14px;">
              <strong>Security Tip:</strong> If you didn't request this code, please ignore this email and your account remains secure.
            </p>
          </div>

          <!-- Expiry Warning -->
          <p style="margin: 20px 0 0 0; color: #ef4444; font-size: 14px; font-weight: 500;">
            ⏰ This code expires in ${expiryMinutes} minutes
          </p>

          <!-- Footer -->
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            This is an automated message from ${companyName}. Please do not reply to this email.
          </p>
          <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
            © ${new Date().getFullYear()} ${companyName}. All rights reserved.
          </p>
        </div>
      </div>
    `,
    text: `
Hello ${name},

${description}

${otp}

${instruction}
${warning}

If you didn't request this code, please ignore this email and your account remains secure.

This code expires in ${expiryMinutes} minutes.

---
This is an automated message from ${companyName}. Please do not reply to this email.
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
    `.trim(),
  };
}

/**
 * Send 2FA OTP email
 * @param {object} params - Email parameters
 * @param {string} params.toEmail - Recipient email
 * @param {string} params.otp - 6-digit OTP code
 * @param {string} params.name - User name
 * @param {number} params.expiryMinutes - OTP expiry time in minutes (default: 5)
 * @param {string} params.context - Email context: 'login' or 'disable' (default: 'login')
 * @returns {Promise<object>} Email send result with messageId
 */
export async function send2FAOtpEmail({
  toEmail,
  otp,
  name = "User",
  expiryMinutes = 5,
  context = "login",
}) {
  try {
    const transporter = nodemailer.createTransport(getMailConfig());
    const fromEmail = process.env.COMPANY_EMAIL || process.env.SMTP_USER;
    const fromName = process.env.COMPANY_NAME || "HRMS";

    const template = build2FAOTPTemplate({
      otp,
      name,
      expiryMinutes,
      context,
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log(`✅ 2FA OTP email sent to ${toEmail} - Message ID: ${info.messageId}`);

    return {
      delivered: true,
      provider: "smtp",
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`❌ Failed to send 2FA OTP email to ${toEmail}:`, error.message);

    // Log but don't throw - we want the OTP to be saved even if email fails
    // In production, you might want to implement retry logic or alerts
    return {
      delivered: false,
      provider: "smtp",
      error: error.message,
    };
  }
}

/**
 * Send OTP email (legacy alias for backward compatibility)
 * @deprecated Use send2FAOtpEmail instead
 */
export async function sendOTPEmail(params) {
  return send2FAOtpEmail(params);
}
