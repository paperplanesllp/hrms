import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    name: { type: String }, // For group chats
    isGroupChat: { type: Boolean, default: false },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Group admin
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

chatSchema.index({ participants: 1 });

export const Chat = mongoose.model("Chat", chatSchema);
