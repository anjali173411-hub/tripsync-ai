import express from "express";
import Trip from "../models/Trip.js";
import Expense from "../models/Expense.js";
import Preference from "../models/Preference.js";
import Itinerary from "../models/Itinerary.js";
import { verifyToken } from "../middleware/auth.js";
import { getBudgetSuggestions, AIServiceError } from "../services/itineraryConsensusService.js";

const router = express.Router();

const SUGGESTIONS_FROM_PERCENT = 80;

function listHasId(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].toString() === id.toString()) {
      return true;
    }
  }
  return false;
}

async function getMemberTrip(tripId, userId) {
  const trip = await Trip.findById(tripId).populate("members", "name");

  if (!trip) {
    return { error: "Trip not found", status: 404 };
  }

  const memberIds = [];
  for (let i = 0; i < trip.members.length; i++) {
    memberIds.push(trip.members[i]._id);
  }

  if (!listHasId(memberIds, userId)) {
    return { error: "You are not a member of this trip", status: 403 };
  }

  return { trip: trip };
}

function addUpExpenses(expenses) {
  let total = 0;
  for (let i = 0; i < expenses.length; i++) {
    total = total + expenses[i].amount;
  }
  return total;
}

router.post("/:tripId/expenses", verifyToken, async (req, res) => {
  try {
    const { title, category, amount, expenseDate, notes, activityName } = req.body;

    const result = await getMemberTrip(req.params.tripId, req.user.id);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    if (!title || amount === undefined || amount === null) {
      return res.status(400).json({
        message: "Expense title and amount are required"
      });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero"
      });
    }

    const allowedCategories = Expense.schema.path("category").enumValues;
    const chosenCategory = category || "misc";

    if (!allowedCategories.includes(chosenCategory)) {
      return res.status(400).json({
        message: "Category must be one of: " + allowedCategories.join(", ")
      });
    }

    // A double click sends the same expense twice within a moment; keep only the first.
    const sameExpenseJustAdded = await Expense.findOne({
      trip: result.trip._id,
      paidBy: req.user.id,
      title: String(title),
      amount: Number(amount),
      category: chosenCategory,
      createdAt: { $gte: new Date(Date.now() - 10000) }
    });

    if (sameExpenseJustAdded) {
      return res.status(409).json({
        message: "This expense was just added"
      });
    }

    const expense = await Expense.create({
      trip: result.trip._id,
      paidBy: req.user.id,
      title: String(title),
      category: chosenCategory,
      amount: Number(amount),
      activityName: activityName ? String(activityName) : "",
      expenseDate: expenseDate || new Date(),
      notes: notes ? String(notes) : ""
    });

    res.status(201).json({
      message: "Expense added successfully",
      expense
    });
  } catch (error) {
    console.error("Add expense error:", error);
    res.status(500).json({
      message: "Could not add expense"
    });
  }
});

router.get("/:tripId/budget", verifyToken, async (req, res) => {
  try {
    const result = await getMemberTrip(req.params.tripId, req.user.id);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    const trip = result.trip;

    const expenses = await Expense.find({ trip: trip._id })
      .populate("paidBy", "name email")
      .sort({ expenseDate: 1 });

    const totalSpent = addUpExpenses(expenses);

    const preferences = await Preference.find({ trip: trip._id });

    const fairShare = totalSpent / trip.members.length;

    const members = [];
    for (let i = 0; i < trip.members.length; i++) {
      const member = trip.members[i];

      let contribution = 0;
      for (let j = 0; j < preferences.length; j++) {
        if (preferences[j].user.toString() === member._id.toString()) {
          contribution = preferences[j].budgetContribution;
        }
      }

      let paid = 0;
      for (let j = 0; j < expenses.length; j++) {
        if (expenses[j].paidBy && expenses[j].paidBy._id.toString() === member._id.toString()) {
          paid = paid + expenses[j].amount;
        }
      }

      members.push({
        id: member._id,
        name: member.name,
        contribution: contribution,
        paid: paid,
        fairShare: Math.round(fairShare),
        balance: Math.round(paid - fairShare)
      });
    }

    const percentUsed = trip.budget > 0 ? Math.round((totalSpent / trip.budget) * 100) : 0;

    res.json({
      budget: trip.budget,
      totalSpent: totalSpent,
      remaining: trip.budget - totalSpent,
      overBudget: totalSpent > trip.budget,
      percentUsed: percentUsed,
      canAskForSuggestions: percentUsed >= SUGGESTIONS_FROM_PERCENT,
      suggestionsFromPercent: SUGGESTIONS_FROM_PERCENT,
      members: members,
      expenses: expenses
    });
  } catch (error) {
    console.error("Get budget error:", error);
    res.status(500).json({
      message: "Could not load budget"
    });
  }
});

router.post("/:tripId/budget/suggestions", verifyToken, async (req, res) => {
  try {
    const result = await getMemberTrip(req.params.tripId, req.user.id);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    const trip = result.trip;
    const expenses = await Expense.find({ trip: trip._id });
    const totalSpent = addUpExpenses(expenses);

    if (trip.budget > 0 && (totalSpent / trip.budget) * 100 < SUGGESTIONS_FROM_PERCENT) {
      return res.status(400).json({
        message: "Money-saving tips are offered once you have spent " + SUGGESTIONS_FROM_PERCENT + "% of the budget"
      });
    }

    const spendingByCategory = [];
    for (let i = 0; i < expenses.length; i++) {
      let found = null;
      for (let j = 0; j < spendingByCategory.length; j++) {
        if (spendingByCategory[j].name === expenses[i].category) {
          found = spendingByCategory[j];
        }
      }
      if (found) {
        found.amount = found.amount + expenses[i].amount;
      } else {
        spendingByCategory.push({ name: expenses[i].category, amount: expenses[i].amount });
      }
    }

    const plannedActivities = [];
    const itinerary = await Itinerary.findOne({ trip: trip._id });
    if (itinerary) {
      for (let d = 0; d < itinerary.days.length; d++) {
        for (let a = 0; a < itinerary.days[d].activities.length; a++) {
          plannedActivities.push(itinerary.days[d].activities[a]);
        }
      }
    }

    const aiResult = await getBudgetSuggestions(
      trip,
      trip.members.length,
      totalSpent,
      spendingByCategory,
      plannedActivities
    );

    res.json({
      suggestions: aiResult.suggestions
    });
  } catch (error) {
    if (error instanceof AIServiceError) {
      return res.status(502).json({ message: error.message });
    }

    console.error("Budget suggestions error:", error);
    res.status(500).json({
      message: "Could not get suggestions"
    });
  }
});

export default router;
