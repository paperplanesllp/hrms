import mongoose from "mongoose";

export const EVENT_PURPOSE = Object.freeze({
  PUBLIC_HOLIDAY: "PUBLIC_HOLIDAY",
  REMINDER: "REMINDER",
  MEETING: "MEETING",
  PERSONAL: "PERSONAL"
});

export const EVENT_VISIBILITY = Object.freeze({
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE"
});

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    date: {
      type: String, // YYYY-MM-DD format
      required: true
    },
    startTime: {
      type: String, // HH:MM format
      default: "09:00"
    },
    endTime: {
      type: String, // HH:MM format
      default: "10:00"
    },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
      default: "ACTIVE"
    },
    color: {
      type: String,
      default: "blue" // blue, green, red, purple, yellow, etc
    },
    purpose: {
      type: String,
      enum: Object.values(EVENT_PURPOSE),
      default: EVENT_PURPOSE.PERSONAL
    },
    visibility: {
      type: String,
      enum: Object.values(EVENT_VISIBILITY),
      default: EVENT_VISIBILITY.PRIVATE
    }
  },
  { timestamps: true }
);

// Index for efficient querying by user and date
eventSchema.index({ userId: 1, date: 1 });
eventSchema.index({ userId: 1, startTime: 1 });
eventSchema.index({ companyId: 1, purpose: 1, visibility: 1, date: 1 });
eventSchema.index({ companyId: 1, date: 1 });

export const Event = mongoose.model("Event", eventSchema);
