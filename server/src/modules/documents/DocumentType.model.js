import mongoose from "mongoose";

const documentTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    description: { type: String, default: "" },
    
    // Who needs to submit this document
    applicableTo: {
      type: String,
      enum: ["all", "specific_departments", "specific_roles"],
      default: "all"
    },
    
    // If applicableTo is specific, list departments or roles
    departmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department" }],
    roles: [{ type: String }],
    
    // Deadline for submission
    deadline: { type: Date, required: true },
    isRecurring: { type: Boolean, default: false },
    recurringFrequency: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      default: null
    },
    
    // Status
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

documentTypeSchema.index({ companyId: 1, name: 1 });

export const DocumentType = mongoose.model("DocumentType", documentTypeSchema);
