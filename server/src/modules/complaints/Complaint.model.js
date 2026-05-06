import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      index: true 
    },
    subject: { 
      type: String, 
      required: true, 
      trim: true,
      minlength: 5,
      maxlength: 200
    },
    message: { 
      type: String, 
      required: true,
      minlength: 10,
      maxlength: 5000
    },
    category: { 
      type: String, 
      enum: ["Technical Issue", "Leave Management", "Payroll", "Attendance", "Others"],
      default: "Others"
    },
    priority: { 
      type: String, 
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium"
    },
    status: { 
      type: String, 
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
      index: true
    },
    submittedAt: { 
      type: Date, 
      default: Date.now,
      index: true
    },
    replyMessage: { 
      type: String, 
      default: ""
    },
    repliedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      default: null
    },
    repliedAt: { 
      type: Date, 
      default: null
    },
    deadlineDate: { 
      type: Date,
      index: true
    },
    isDeadlinePassed: { 
      type: Boolean, 
      default: false
    },
    attachmentUrl: { 
      type: String, 
      default: "" 
    },
    satisfactionRating: { 
      type: Number, 
      min: 1, 
      max: 5, 
      default: null 
    },
    satisfactionComment: { 
      type: String, 
      default: "" 
    }
  },
  { timestamps: true }
);

export const Complaint = mongoose.model("Complaint", complaintSchema);