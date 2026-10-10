
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
    // Default interests and pace, used to pre-fill the preference form of new trips (FR-1.4)
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
    // Goes up by 1 every time the user logs out.
    // Login tokens remember this number, so old tokens stop working after logout (FR-1.6).
    tokenVersion: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
