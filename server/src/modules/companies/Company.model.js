import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    domain: { type: String, default: null, trim: true, unique: true, sparse: true, index: true },
    contactEmail: { type: String, default: "", trim: true, lowercase: true },
    contactPhone: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const Company = mongoose.models.Company || mongoose.model("Company", companySchema);
