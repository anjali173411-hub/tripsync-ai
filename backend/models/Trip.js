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
