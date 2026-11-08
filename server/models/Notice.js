import mongoose from "mongoose";
import { ALLOWED_COLLEGES, AUDIENCE_SCOPES } from "./constants.js";

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
    },
    description: {
      type: String,
      required: [true, "Short description is required"],
      trim: true,
    },
    details: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["Exams", "Academics", "Events", "Placements", "Fees", "General"],
        message: "{VALUE} is not a valid category",
      },
      default: "General",
    },
    priority: {
      type: String,
      required: [true, "Priority is required"],
      enum: {
        values: ["High", "Medium", "Low"],
        message: "{VALUE} is not a valid priority",
      },
      default: "Medium",
    },
    deadline: {
      type: String,
      default: "",
      trim: true,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },
    college: {
      type: String,
      required: [true, "College is required"],
      default: ALLOWED_COLLEGES[0],
      trim: true,
    },
    createdBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      name: { type: String, required: true },
      adminType: { type: String, enum: ["Faculty", "HOD", "Dean"], required: true },
      department: { type: String, default: "ALL" },
    },
    audience: {
      scope: {
        type: String,
        enum: AUDIENCE_SCOPES,
        default: "college",
      },
      department: {
        type: String,
        default: "ALL",
        trim: true,
        uppercase: true,
      },
      year: {
        type: String,
        default: "ALL",
        trim: true,
      },
      section: {
        type: String,
        default: "ALL",
        trim: true,
        uppercase: true,
      },
    },
    attachments: [
      {
        name: { type: String, required: true },
        dataUrl: { type: String, required: true },
        fileType: { type: String, default: "application/octet-stream" },
        size: { type: Number, default: 0 },
      },
    ],
    photos: [
      {
        type: String,
      },
    ],
    googleLinks: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    poll: {
      question: { type: String, default: "" },
      options: [
        {
          text: { type: String, required: true },
          votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        // backward compatibility fields for existing UI components
        ret.collegeName = ret.college;
        ret.targetBranch = ret.audience?.department || "ALL";
        ret.targetSection = ret.audience?.section || "ALL";
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Notice = mongoose.model("Notice", noticeSchema);
