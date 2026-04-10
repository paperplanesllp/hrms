import nodemailer from "nodemailer";
import { ApiError } from "./apiError.js";
import { StatusCodes } from "http-status-codes";

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

function buildOtpTemplate({ otp, name = "User" }) {
  const companyName = process.env.COMPANY_NAME || "HRMS";

  return {
    subject: `Your ${companyName} Login OTP`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin-bottom: 12px;">Hello ${name},</h2>
        <p>Your OTP for temporary login is:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 14px 0; color: #0f766e;">
          ${otp}
        </div>
        <p>This OTP is valid for 5 minutes.</p>
        <p style="margin-top: 14px; color: #6b7280;">Do not share this OTP with anyone.</p>
      </div>
    `,
    text: `Hello ${name},\n\nYour OTP for temporary login is ${otp}.\nThis OTP is valid for 5 minutes.\nDo not share this OTP with anyone.`,
  };
}

export async function sendTemporaryOtpEmail({ toEmail, otp, name }) {
  const transporter = nodemailer.createTransport(getMailConfig());

  const fromEmail = process.env.COMPANY_EMAIL || process.env.SMTP_USER;
  const fromName = process.env.COMPANY_NAME || "HRMS";
  const template = buildOtpTemplate({ otp, name });

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return { delivered: true, provider: "smtp", messageId: info.messageId };
}
