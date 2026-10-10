
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    // False when an admin has hidden the review (FR-9.3)
    visible: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

reviewSchema.index(
  { destination: 1, user: 1, trip: 1 },
  { unique: true }
);

const Review = mongoose.model("Review", reviewSchema);

export default Review;
