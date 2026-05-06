import mongoose from "mongoose";

const policySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: "Privacy Policy"
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['privacy', 'company'],
    default: 'privacy'
  },
  version: {
    type: Number,
    default: 1
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
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: function() { return this.type === 'company'; }
  }
}, {
  timestamps: true
});

export default mongoose.model("Policy", policySchema);