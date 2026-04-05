import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String, default: "" },
    headName: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    budget: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

export const Department = mongoose.models.Department || mongoose.model("Department", departmentSchema);
