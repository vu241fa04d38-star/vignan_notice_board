import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ALLOWED_COLLEGES, DEPARTMENTS, YEARS, SECTIONS, ADMIN_TYPES } from "./constants.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    adminType: {
      type: String,
      enum: ["None", ...ADMIN_TYPES],
      default: "None",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    college: {
      type: String,
      required: [true, "College is required"],
      default: ALLOWED_COLLEGES[0],
      trim: true,
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
    regNo: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    readNoticeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notice",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        // backward compatibility alias
        ret.collegeName = ret.college;
        ret.branch = ret.department;
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index to guarantee registration number is unique per college for students
userSchema.index(
  { college: 1, regNo: 1 },
  { unique: true, partialFilterExpression: { regNo: { $type: "string", $gt: "" } } }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
