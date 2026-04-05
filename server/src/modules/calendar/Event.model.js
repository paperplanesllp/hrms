import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    }
  },
  { timestamps: true }
);

// Index for efficient querying by user and date
eventSchema.index({ userId: 1, date: 1 });
eventSchema.index({ userId: 1, startTime: 1 });

export const Event = mongoose.model("Event", eventSchema);
