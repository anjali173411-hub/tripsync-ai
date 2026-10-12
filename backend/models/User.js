import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["traveller", "admin"],
      default: "traveller"
    },
    isActive: {
      type: Boolean,
      default: true
    },

    defaultPreferences: {
      interests: {
        type: [String],
        default: []
      },
      pace: {
        type: String,
        enum: ["relaxed", "balanced", "packed"],
        default: "balanced"
      }
    },

    tokenVersion: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
