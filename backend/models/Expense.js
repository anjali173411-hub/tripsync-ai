
import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
  
    category: {
      type: String,
      enum: ["accommodation", "food", "transport", "activities", "misc"],
      default: "misc"
    },
    // Optional: the itinerary activity this money was spent on (FR-7.1)
    activityName: {
      type: String,
      default: ""
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    expenseDate: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;
