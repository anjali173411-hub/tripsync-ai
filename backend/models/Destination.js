
import mongoose from "mongoose";

// A destination managed by the admin (SRS 6.7, FR-10.1)
const destinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    // Country or region, e.g. "India"
    location: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    // How expensive the place usually is
    averageCostTier: {
      type: String,
      enum: ["budget", "mid-range", "luxury"],
      default: "mid-range"
    },
    // Links to photos of the place
    images: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

const Destination = mongoose.model(
  "Destination",
  destinationSchema
);

export default Destination;
