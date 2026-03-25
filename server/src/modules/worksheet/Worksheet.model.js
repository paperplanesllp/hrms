import mongoose from "mongoose";

const worksheetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    task: { type: String, required: true },
    hours: { type: Number, required: true, min: 0, max: 24 },
    notes: { type: String, default: "" },
    
    // New pause/resume tracking fields
    startTime: { type: String, default: null }, // HH:MM format (10:00)
    endTime: { type: String, default: null }, // HH:MM format (18:00)
    status: { type: String, enum: ["active", "paused", "completed"], default: "active" },
    currentSessionStart: { type: String, default: null }, // When current session started (HH:MM)
    
    // Track all pauses/interruptions
    interruptions: [
      {
        pausedAt: String, // HH:MM
        pausedTime: { type: Date, default: Date.now }, // For accurate duration calculation
        resumedAt: String, // HH:MM
        resumedTime: Date,
        reason: String, // e.g., "Meeting", "Break", "Server Issue"
        duration: Number, // minutes
      }
    ],
    
    // Summary fields
    totalActiveTime: { type: Number, default: 0 }, // minutes
    totalPausedTime: { type: Number, default: 0 }, // minutes
    
    // Time extension requests
    timeExtensionRequests: [
      {
        requestedTime: Number, // hours requested
        reason: String, // why more time is needed
        requestedAt: { type: Date, default: Date.now },
        sentTo: { type: String, enum: ["HR", "ADMIN", "BOTH"], default: "BOTH" }, // who was notified
        status: { type: String, enum: ["sent", "read"], default: "sent" }, // notification status
      }
    ],
    lastExtensionRequest: Date, // timestamp of last request (to prevent spam)
  },
  { timestamps: true }
);

// Indexes for query performance
worksheetSchema.index({ userId: 1, date: 1 }); // Optimize for date queries
worksheetSchema.index({ userId: 1 }); // Optimize for user queries
worksheetSchema.index({ date: 1 });

export const Worksheet = mongoose.model("Worksheet", worksheetSchema);
