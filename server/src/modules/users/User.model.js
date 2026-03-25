import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "../../middleware/roles.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    phone: { type: String, default: "" },
    employeeId: { type: String, sparse: true, unique: true },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
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

    // Department & Designation
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    designationId: { type: mongoose.Schema.Types.ObjectId, ref: "Designation", default: null },

    // Real-time geolocation tracking (updated every 10 seconds after login)
    currentLatitude: { type: Number, default: null },
    currentLongitude: { type: Number, default: null },
    currentLocationAccuracy: { type: Number, default: null },
    lastLocationUpdate: { type: Date, default: null },
    isActive: { type: Boolean, default: false }, // true when user is actively logged in

    refreshTokenHash: { type: String, default: "" },
    resetPasswordToken: { type: String, default: "" },
    resetPasswordExpires: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    accountLocked: { type: Boolean, default: false },
    lockUntil: { type: Date }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export const User = mongoose.model("User", userSchema);