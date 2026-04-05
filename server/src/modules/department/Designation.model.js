import mongoose from "mongoose";

const designationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true, index: true },
    description: { type: String, default: "" },
    level: { type: String, default: "mid", enum: ["entry", "mid", "senior", "lead", "manager", "director"] },
    salary: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

// Compound unique index on name and departmentId
designationSchema.index({ name: 1, departmentId: 1 }, { unique: true });

export const Designation = mongoose.model("Designation", designationSchema);
