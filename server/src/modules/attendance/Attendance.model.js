import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    checkIn: { type: String, default: "" },  // "09:20"
    checkOut: { type: String, default: "" }, // "18:40"
    shiftStart: { type: String, default: "09:30" },
    shiftEnd: { type: String, default: "18:30" },
    shiftName: { type: String, default: "Regular Shift" },
    totalHours: { type: Number, default: 0 }, // Calculated worked hours
    status: { type: String, default: "PRESENT" }, // PRESENT, SHORT_HOURS, HALF_DAY, ABSENT, HOLIDAY
    
    // Geofencing data
    checkInLatitude: { type: Number, default: 0 },
    checkInLongitude: { type: Number, default: 0 },
    isWithinGeofence: { type: Boolean, default: true },
    distanceFromOffice: { type: Number, default: 0 } // Distance in meters
  },
  { timestamps: true }
);

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model("Attendance", attendanceSchema);