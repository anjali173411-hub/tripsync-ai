
import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: ["solo", "group"],
      required: true
    },

    // Where the trip starts, e.g. the home city
    startingFrom: {
      type: String,
      trim: true,
      default: ""
    },

    destination: {
      type: String,
      required: true,
      trim: true
    },

    travelMode: {
      type: String,
      enum: ["train", "bus", "car"]
    },

    destinationLat: {
      type: Number,
      default: null
    },
    destinationLon: {
      type: Number,
      default: null
    },
    destinationFullName: {
      type: String,
      default: ""
    },

    destinationImage: {
      type: String,
      default: null
    },

    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },

    budget: {
      type: Number,
      required: true,
      min: 0
    },

    organiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    // Email addresses of people who were invited but have not accepted yet (FR-2.4).
    // They don't need an account to be invited. When they sign up or log in
    // with this email and click "Accept", they move into "members".
    invitedEmails: [
      {
        type: String,
        lowercase: true,
        trim: true
      }
    ],

    status: {
      type: String,
      enum: ["planning", "finalised", "completed", "archived"],
      default: "planning"
    }
  },
  { timestamps: true }
);

const Trip =
  mongoose.models.Trip || mongoose.model("Trip", tripSchema);

export default Trip;
