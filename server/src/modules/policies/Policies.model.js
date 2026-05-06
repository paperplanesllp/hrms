import mongoose from "mongoose";

const policiesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      default: ""
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    category: {
      type: String,
      enum: ["HR", "Finance", "Operations", "Security", "Other"],
      default: "Other"
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    pdfFileName: {
      type: String,
      default: null
    },
    pdfUrl: {
      type: String,
      default: null
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    }
  },
  { timestamps: true }
);

policiesSchema.index({ isActive: 1, createdAt: -1 });
policiesSchema.index({ companyId: 1, isActive: 1 });

export const Policies = mongoose.model("Policies", policiesSchema);
