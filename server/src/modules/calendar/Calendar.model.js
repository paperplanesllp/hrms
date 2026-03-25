import mongoose from "mongoose";

const calendarSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    shiftStart: { type: String, default: "09:30" },
    shiftEnd: { type: String, default: "18:30" },
    note: { type: String, default: "" }
  },
  { timestamps: true }
);

export const Calendar = mongoose.model("Calendar", calendarSchema);