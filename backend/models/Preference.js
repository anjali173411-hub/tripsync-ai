import mongoose from "mongoose";

const preferenceSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    interests: {
      type: [
        {
          type: String,
          enum: [
            "adventure",
            "food",
            "culture",
            "nightlife",
            "relaxation",
            "shopping",
            "nature",
            "beaches",
            "history",
            "photography"
          ]
        }
      ],
      default: []
    },

    otherInterests: {
      type: [String],
      default: []
    },
    pace: {
      type: String,
      enum: ["relaxed", "balanced", "packed"],
      default: "balanced"
    },

    budgetContribution: {
      type: Number,
      default: 0,
      min: 0
    },
    mustDo: {
      type: [String],
      default: []
    },
    dealBreakers: {
      type: [String],
      default: []
    },

    freeTextNotes: {
      type: String,
      default: "",
      maxlength: 1000
    },

    foodPreference: {
      type: String,
      enum: ["no preference", "vegetarian", "non-vegetarian", "vegan"],
      default: "no preference"
    },

    stayBudget: {
      type: String,
      enum: ["budget", "mid-range", "luxury"],
      default: "mid-range"
    },
    stayType: {
      type: String,
      enum: ["hotel", "homestay", "resort"],
      default: "hotel"
    }
  },
  { timestamps: true }
);

preferenceSchema.index(
  { trip: 1, user: 1 },
  { unique: true }
);

const Preference = mongoose.model(
  "Preference",
  preferenceSchema
);

export default Preference;
