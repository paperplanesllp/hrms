import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    headName: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    budget: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

departmentSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const Department = mongoose.models.Department || mongoose.model("Department", departmentSchema);
