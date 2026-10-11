
import mongoose from "mongoose";

const destinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
  
    location: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    
    averageCostTier: {
      type: String,
      enum: ["budget", "mid-range", "luxury"],
      default: "mid-range"
    },
    
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
