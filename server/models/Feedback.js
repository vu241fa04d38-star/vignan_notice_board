import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["Suggestion", "Notice Discrepancy", "Bug Report", "Appreciation", "General"],
      default: "Suggestion",
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Feedback = mongoose.model("Feedback", feedbackSchema);
