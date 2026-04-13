import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      index: true,
    },
    callType: {
      type: String,
      enum: ["voice", "video"],
      required: true,
    },
    // Canonical status used by frontend timeline UI
    callStatus: {
      type: String,
      enum: ["missed", "completed", "declined", "cancelled", "unanswered"],
      index: true,
    },
    // Status transitions:
    // initiated → ringing → accepted → connected → completed
    //                    → rejected
    //                    → no_answer (timeout)
    //                    → cancelled
    //                    → busy
    //                    → failed
    status: {
      type: String,
      enum: [
        "initiated",      // call just created
        "ringing",        // receiver sees incoming call modal
        "accepted",       // receiver accepted
        "connected",      // WebRTC connection established
        "completed",      // call ended normally
        "rejected",       // receiver actively rejected
        "no_answer",      // receiver did not answer (timeout)
        "cancelled",      // caller cancelled before answer
        "busy",           // receiver already in another call
        "failed",         // connection or technical failure
      ],
      default: "initiated",
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    answeredAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    // Duration in seconds (populated on call end)
    duration: {
      type: Number,
      default: 0,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    // Which user ended the call (caller or receiver)
    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Detailed reason for failure or status
    failureReason: {
      type: String,
    },
  },
  { 
    timestamps: true,
    // Helps with finding missed calls quickly
    indexes: [
      { caller: 1, createdAt: -1 },
      { receiver: 1, createdAt: -1 },
      { conversationId: 1, createdAt: -1 },
      { status: 1, createdAt: -1 },
    ]
  }
);

callLogSchema.pre("validate", function syncLegacyAndCanonicalFields() {
  const mapToCanonical = {
    no_answer: "missed",
    rejected: "declined",
    completed: "completed",
    cancelled: "cancelled",
    busy: "unanswered",
    failed: "unanswered",
    ringing: "unanswered",
    accepted: "unanswered",
    connected: "completed",
    initiated: "unanswered",
  };

  if (!this.callStatus && this.status) {
    this.callStatus = mapToCanonical[this.status] || "missed";
  }

  if (!this.status && this.callStatus) {
    const mapToLegacy = {
      missed: "no_answer",
      declined: "rejected",
      completed: "completed",
      cancelled: "cancelled",
      unanswered: "failed",
    };
    this.status = mapToLegacy[this.callStatus] || "no_answer";
  }

  if (!this.initiatedBy && this.caller) {
    this.initiatedBy = this.caller;
  }

  if ((!this.durationSeconds || this.durationSeconds <= 0) && this.duration > 0) {
    this.durationSeconds = this.duration;
  }

  if ((!this.duration || this.duration <= 0) && this.durationSeconds > 0) {
    this.duration = this.durationSeconds;
  }

});

export const CallLog = mongoose.model("CallLog", callLogSchema);
