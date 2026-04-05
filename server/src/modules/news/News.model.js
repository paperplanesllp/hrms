import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    body: { type: String, required: true },
    imageUrl: { type: String, default: null }, // Image URL (uploaded to server)
    publishDate: { type: Date, default: Date.now, index: true },
    isPolicyUpdate: { type: Boolean, default: false }, // Privacy Policy Update toggle
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // For tracking policy update views
    status: { type: String, enum: ["draft", "published"], default: "published" }
  },
  { timestamps: true }
);

newsSchema.index({ publishDate: -1 }); // Sort by latest first

export const News = mongoose.model("News", newsSchema);