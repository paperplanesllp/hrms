import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "../../middleware/roles.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    phone: { type: String, default: "" },
    employeeId: { type: String, sparse: true, unique: true },
    salaryBand: { type: String, default: "" },
    joiningDate: { type: Date, default: null },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
    accountType: { type: String, enum: ["EMPLOYEE", "TEMPORARY"], default: "EMPLOYEE" },
    approvalStatus: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "APPROVED" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    approvalNote: { type: String, default: "" },
    temporaryRecord: {
      wasTemporary: { type: Boolean, default: false },
      registeredAt: { type: Date, default: null },
      approvedAt: { type: Date, default: null },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      approvalNote: { type: String, default: "" },
      convertedAt: { type: Date, default: null },
      convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    passwordHash: { type: String, required: true },
    profileImageUrl: { type: String, default: "" },
    twoFactorEnabled: { type: Boolean, default: false },

    // Personal Information
    gender: { type: String, enum: ["Male", "Female", "Other", null], default: null },
    dateOfBirth: { type: Date, default: null },
    maritalStatus: { type: String, enum: ["Single", "Married", "Divorced", "Widowed", null], default: null },
    nationality: { type: String, default: "" },
    bloodGroup: { type: String, enum: ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-", null], default: null },
    emergencyContact: { type: String, default: "" },

    // Office Location (where employee works)
    officeLatitude: { type: Number, default: 0 },
    officeLongitude: { type: Number, default: 0 },
    isCompanyLocation: { type: Boolean, default: false }, // true = this is company HQ location

    // Working Days Configuration (0=Sunday, 1=Monday, ..., 6=Saturday)
    // Default: [1,2,3,4,5] = Monday to Friday (Saturday & Sunday are off)
    workingDays: { 
      type: [Number], 
      default: [1, 2, 3, 4, 5],
      validate: {
        validator: function(v) {
          return Array.isArray(v) && v.every(day => day >= 0 && day <= 6);
        },
        message: "Working days must be numbers between 0-6"
      }
    },

    // Company-wide default shift timing (used when date-specific calendar shift is not set)
    companyShiftStart: { type: String, default: "09:30" },
    companyShiftEnd: { type: String, default: "18:30" },

    // Department & Designation
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    designationId: { type: mongoose.Schema.Types.ObjectId, ref: "Designation", default: null },

    // Real-time geolocation tracking (updated every 10 seconds after login)
    currentLatitude: { type: Number, default: null },
    currentLongitude: { type: Number, default: null },
    currentLocationAccuracy: { type: Number, default: null },
    lastLocationUpdate: { type: Date, default: null },
    isActive: { type: Boolean, default: false }, // true when user is actively logged in

    // Email Notification Preferences
    emailNotificationPreferences: {
      taskAssigned: { type: Boolean, default: true },
      taskAccepted: { type: Boolean, default: true },
      taskRejected: { type: Boolean, default: true },
      taskCompleted: { type: Boolean, default: true },
      taskReassigned: { type: Boolean, default: true },
      taskForwarded: { type: Boolean, default: true },
      dueReminder: { type: Boolean, default: true },
      taskOverdue: { type: Boolean, default: true }
    },

    // Push subscriptions (Web Push / PWA) used as fallback for incoming calls.
    pushSubscriptions: {
      type: [
        {
          endpoint: { type: String, required: true },
          keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
          },
          userAgent: { type: String, default: "" },
          createdAt: { type: Date, default: Date.now },
          updatedAt: { type: Date, default: Date.now },
          lastUsedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    refreshTokenHash: { type: String, default: "" },
    rememberMeEnabled: { type: Boolean, default: false }, // ✅ "Stay logged in" preference
    resetPasswordToken: { type: String, default: "" },
    resetPasswordExpires: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    accountLocked: { type: Boolean, default: false },
    lockUntil: { type: Date },
    // Two-Factor Authentication (2FA) fields
    otpCodeHash: { type: String, default: "" }, // Hash of OTP used for login
    otpExpiresAt: { type: Date, default: null }, // When login OTP expires
    otpAttempts: { type: Number, default: 0 }, // Failed OTP attempts counter
    otpLastSentAt: { type: Date, default: null }, // When OTP was last sent (for rate limiting)

    // Two-Factor Authentication (2FA) Disable fields
    disable2FAOtpHash: { type: String, default: "" }, // Hash of OTP used to disable 2FA
    disable2FAOtpExpiresAt: { type: Date, default: null }, // When disable 2FA OTP expires
    disable2FAOtpAttempts: { type: Number, default: 0 }, // Failed disable 2FA OTP attempts
    disable2FAOtpLastSentAt: { type: Date, default: null }, // When disable 2FA OTP was last sent

    // Temporary token for 2FA login flow (between password verification and OTP)
    temp2FAToken: { type: String, default: "" },
    temp2FATokenExpires: { type: Date, default: null },

    // Real-time presence tracking
    isOnline: { type: Boolean, default: false, index: true },
    lastSeen: { type: Date, default: null },
    lastActivityAt: { type: Date, default: null }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.index({ "pushSubscriptions.endpoint": 1 });

export const User = mongoose.model("User", userSchema);