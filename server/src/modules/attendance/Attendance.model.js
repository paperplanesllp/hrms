import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD in IST
    checkIn: { type: String, default: "" },  // "09:20" in 24-hour format
    checkOut: { type: String, default: "" }, // "18:40" in 24-hour format
    shiftStart: { type: String, default: "09:30" },
    shiftEnd: { type: String, default: "18:30" },
    shiftName: { type: String, default: "Regular Shift" },
    totalHours: { type: Number, default: 0 }, // Calculated worked hours
    status: { type: String, default: "PRESENT" }, // PRESENT, SHORT_HOURS, HALF_DAY, ABSENT, HOLIDAY, INVALID_LOCATION
    
    // Check-In Geofencing Data
    checkInLatitude: { type: Number, default: 0 },
    checkInLongitude: { type: Number, default: 0 },
    checkInAccuracy: { type: Number, default: null }, // GPS accuracy in meters
    checkInDistanceFromOffice: { type: Number, default: 0 }, // Distance in meters
    checkInWithinGeofence: { type: Boolean, default: true },
    
    // Check-Out Geofencing Data
    checkOutLatitude: { type: Number, default: 0 },
    checkOutLongitude: { type: Number, default: 0 },
    checkOutAccuracy: { type: Number, default: null }, // GPS accuracy in meters
    checkOutDistanceFromOffice: { type: Number, default: 0 }, // Distance in meters
    checkOutWithinGeofence: { type: Boolean, default: true },
    
    // Backward compatibility (deprecated - kept for existing records)
    isWithinGeofence: { type: Boolean, default: true },
    distanceFromOffice: { type: Number, default: 0 },
    
    // Timezone tracking
    timezone: { type: String, default: "Asia/Kolkata" }, // IST tracking
    
    // Timestamps for audit
    checkInTimestamp: { type: Date, default: null }, // Full ISO timestamp of check-in
    checkOutTimestamp: { type: Date, default: null } // Full ISO timestamp of check-out
  },
  { timestamps: true }
);

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model("Attendance", attendanceSchema);