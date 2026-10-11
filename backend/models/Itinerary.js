
import mongoose from "mongoose";

const itinerarySchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      unique: true
    },
    days: [
      {
        dayNumber: {
          type: Number,
          required: true
        },
        date: {
          type: Date,
          required: true
        },
        activities: [
          {
            time: {
              type: String,
              default: ""
            },
            name: {
              type: String,
              required: true
            },
            category: {
              type: String,
              default: "sightseeing"
            },
            description: {
              type: String,
              default: ""
            },
            estimatedCost: {
              type: Number,
              default: 0,
              min: 0
            },
            // Names of members whose preferences this activity satisfies (FR-5.6)
            matchedMembers: {
              type: [String],
              default: []
            }
          }
        ]
      }
    ],
    // The AI's suggestion of where the group should stay (not a booking)
    stay: {
      area: { type: String, default: "" },
      placeType: { type: String, default: "" }, // hotel, homestay, hostel or resort
      budgetLevel: { type: String, default: "" },
      costPerNight: { type: Number, default: 0, min: 0 }, // for the whole group
      reason: { type: String, default: "" },
      matchedMembers: { type: [String], default: [] }
    },
    status: {
      type: String,
      enum: ["draft", "ready", "finalised"],
      default: "draft"
    }
  },
  { timestamps: true }
);

const Itinerary = mongoose.model("Itinerary", itinerarySchema);

export default Itinerary;
