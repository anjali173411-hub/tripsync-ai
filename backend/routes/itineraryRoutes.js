
import express from "express";
import Trip from "../models/Trip.js";
import Preference from "../models/Preference.js";
import Itinerary from "../models/Itinerary.js";
import ConflictVote from "../models/ConflictVote.js";
import { verifyToken } from "../middleware/auth.js";
import {
  generateItinerary,
  regenerateDay,
  AIServiceError
} from "../services/itineraryConsensusService.js";

const router = express.Router();

// The longest trip the AI will plan
const MAX_TRIP_DAYS = 30;

// ---------------- Helper functions ----------------

// Checks if an id is in a list of ids
function listHasId(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].toString() === id.toString()) {
      return true;
    }
  }
  return false;
}

// How many days the trip lasts (start and end day both count)
function countTripDays(trip) {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  return Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

// Collects every member's preferences in the simple shape the AI service wants.
// Returns { members } or { error } if someone hasn't filled in their preferences.
async function getMembersForAI(trip) {
  const preferences = await Preference.find({
    trip: trip._id,
    user: { $in: trip.members }
  }).populate("user", "name");

  if (preferences.length < trip.members.length) {
    return { error: "Every trip member must save their preferences first" };
  }

  const members = [];
  for (let i = 0; i < preferences.length; i++) {
    const preference = preferences[i];

    members.push({
      name: preference.user.name,
      interests: preference.interests,
      otherInterests: preference.otherInterests,
      pace: preference.pace,
      budgetContribution: preference.budgetContribution,
      mustDo: preference.mustDo,
      dealBreakers: preference.dealBreakers,
      freeTextNotes: preference.freeTextNotes,
      foodPreference: preference.foodPreference,
      stayBudget: preference.stayBudget,
      stayType: preference.stayType
    });
  }

  return { members: members };
}

// Names of members who have not saved their preferences yet
async function getMembersWithoutPreferences(trip) {
  const populatedTrip = await Trip.findById(trip._id).populate("members", "name");
  const preferences = await Preference.find({ trip: trip._id });

  const names = [];
  for (let i = 0; i < populatedTrip.members.length; i++) {
    const member = populatedTrip.members[i];

    let saved = false;
    for (let j = 0; j < preferences.length; j++) {
      if (preferences[j].user.toString() === member._id.toString()) {
        saved = true;
      }
    }

    if (!saved) {
      names.push(member.name);
    }
  }

  return names;
}

// Loads the trip and itinerary for editing.
// Only the organiser may edit, and only while the trip is still being planned.
// Returns { trip, itinerary } or { error, status }.
async function getEditableItinerary(tripId, userId) {
  const trip = await Trip.findById(tripId);

  if (!trip) {
    return { error: "Trip not found", status: 404 };
  }

  if (trip.organiser.toString() !== userId) {
    return { error: "Only the organiser can change the itinerary", status: 403 };
  }

  const itinerary = await Itinerary.findOne({ trip: trip._id });

  if (!itinerary) {
    return { error: "Generate an itinerary first", status: 404 };
  }

  if (itinerary.status === "finalised" || trip.status !== "planning") {
    return { error: "A finalised itinerary cannot be changed", status: 400 };
  }

  return { trip: trip, itinerary: itinerary };
}

// Finds an activity by its id. Returns { day, index } or null.
function findActivity(itinerary, activityId) {
  for (let d = 0; d < itinerary.days.length; d++) {
    const day = itinerary.days[d];

    for (let a = 0; a < day.activities.length; a++) {
      if (day.activities[a]._id.toString() === activityId) {
        return { day: day, index: a };
      }
    }
  }
  return null;
}

// Turns the AI's activities into the shape we save
function toSavedActivities(aiActivities) {
  const activities = [];

  for (let i = 0; i < aiActivities.length; i++) {
    const activity = aiActivities[i];

    activities.push({
      time: activity.time,
      name: activity.name,
      category: activity.category,
      description: activity.description,
      estimatedCost: activity.estimatedCost,
      matchedMembers: activity.matchedMembers
    });
  }

  // Put the activities in time order ("08:00" before "13:00"),
  // in case the AI listed them out of order
  activities.sort(function (first, second) {
    return String(first.time).localeCompare(String(second.time));
  });

  return activities;
}

// Sends an AI error or other error back to the browser
function sendError(res, error, whatFailed) {
  if (error instanceof AIServiceError) {
    // 502 = the problem is with the outside AI service, not the user's request
    return res.status(502).json({
      message: error.message,
      details: error.details
    });
  }

  console.error(whatFailed + ":", error);
  return res.status(500).json({
    message: whatFailed
  });
}

// ---------------- Routes ----------------

// GENERATE THE ITINERARY (organiser only) - FR-4.1, FR-5.1
router.post("/:tripId/generate", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (trip.organiser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the trip organiser can generate the itinerary"
      });
    }

    const existing = await Itinerary.findOne({ trip: trip._id });

    if (existing && existing.status === "finalised") {
      return res.status(400).json({
        message: "A finalised itinerary cannot be regenerated"
      });
    }

    if (trip.status !== "planning") {
      return res.status(400).json({
        message: "The trip is not in planning status"
      });
    }

    const numberOfDays = countTripDays(trip);

    if (numberOfDays < 1) {
      return res.status(400).json({ message: "The trip dates are invalid" });
    }

    if (numberOfDays > MAX_TRIP_DAYS) {
      return res.status(400).json({
        message: "Trips cannot exceed " + MAX_TRIP_DAYS + " days"
      });
    }

    // Everyone invited must accept or decline first, otherwise they'd be left out of the plan
    if (trip.invitedEmails.length > 0) {
      return res.status(400).json({
        message:
          "Still waiting for " + trip.invitedEmails.join(", ") + " to accept the invitation. " +
          "Wait for them, or cancel the invitation on the Members page."
      });
    }

    const result = await getMembersForAI(trip);
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    // Extra instructions are only sent when the organiser clicks "Regenerate"
    let instructions = "";
    if (req.body && req.body.instructions) {
      instructions = String(req.body.instructions);
    }

    // Ask the AI. This is the same call for solo and group trips.
    // If the AI fails, it throws an error and we jump to "catch" below,
    // so nothing gets saved and the old trip data stays safe (SRS 5.4).
    const aiResult = await generateItinerary(trip, numberOfDays, result.members, instructions);

    // Build the days to save. The AI gives day numbers; we work out the real dates.
    const days = [];
    for (let i = 0; i < aiResult.days.length; i++) {
      const date = new Date(trip.startDate);
      date.setDate(date.getDate() + i);

      days.push({
        dayNumber: i + 1,
        date: date,
        activities: toSavedActivities(aiResult.days[i].activities)
      });
    }

    const itinerary = await Itinerary.findOneAndUpdate(
      { trip: trip._id },
      { $set: { trip: trip._id, days: days, stay: aiResult.stay, status: "ready" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    // Replace the old conflicts with the new ones (SRS 6.5). Nobody has voted yet.
    await ConflictVote.deleteMany({ trip: trip._id });

    for (let i = 0; i < aiResult.conflicts.length; i++) {
      const conflict = aiResult.conflicts[i];

      const options = [];
      for (let j = 0; j < conflict.options.length; j++) {
        options.push({
          description: conflict.options[j].description,
          extraCost: conflict.options[j].extraCost,
          voteCount: 0
        });
      }

      await ConflictVote.create({
        trip: trip._id,
        conflictDescription: conflict.description,
        reasoning: conflict.reasoning,
        affectedMembers: conflict.affectedMembers,
        options: options,
        votes: [],
        resolved: false,
        chosenOption: null
      });
    }

    const conflicts = await ConflictVote.find({ trip: trip._id });

    res.json({
      message: "Itinerary generated successfully",
      itinerary: itinerary,
      conflicts: conflicts
    });
  } catch (error) {
    sendError(res, error, "Failed to generate itinerary");
  }
});

// VIEW THE ITINERARY AND ITS CONFLICTS (trip members only)
router.get("/:tripId/itinerary", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (!listHasId(trip.members, req.user.id)) {
      return res.status(403).json({ message: "You are not a member of this trip" });
    }

    const itinerary = await Itinerary.findOne({ trip: trip._id });

    if (!itinerary) {
      return res.status(404).json({
        message: "No itinerary has been generated yet"
      });
    }

    const conflicts = await ConflictVote.find({ trip: trip._id });

    // Members with no saved preferences (e.g. they joined after the plan was made)
    const membersNotInPlan = await getMembersWithoutPreferences(trip);

    res.json({
      itinerary: itinerary,
      conflicts: conflicts,
      membersNotInPlan: membersNotInPlan
    });
  } catch (error) {
    sendError(res, error, "Failed to retrieve itinerary");
  }
});

// EDIT ONE ACTIVITY (organiser only) - FR-4.4
router.put("/:tripId/activities/:activityId", verifyToken, async (req, res) => {
  try {
    const result = await getEditableItinerary(req.params.tripId, req.user.id);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    const found = findActivity(result.itinerary, req.params.activityId);
    if (!found) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const { time, name, description, estimatedCost } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "The activity needs a name" });
    }

    const cost = Number(estimatedCost);
    if (!Number.isFinite(cost) || cost < 0) {
      return res.status(400).json({ message: "Cost must be 0 or more" });
    }

    const activity = found.day.activities[found.index];
    activity.time = String(time || "");
    activity.name = String(name).trim();
    activity.description = String(description || "");
    activity.estimatedCost = cost;

    await result.itinerary.save();

    res.json({
      message: "Activity updated",
      itinerary: result.itinerary
    });
  } catch (error) {
    sendError(res, error, "Could not update activity");
  }
});

// MOVE AN ACTIVITY UP OR DOWN WITHIN ITS DAY (organiser only) - FR-4.4
router.post("/:tripId/activities/:activityId/move", verifyToken, async (req, res) => {
  try {
    const result = await getEditableItinerary(req.params.tripId, req.user.id);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    const found = findActivity(result.itinerary, req.params.activityId);
    if (!found) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const direction = req.body.direction;
    let newIndex = found.index;

    if (direction === "up") {
      newIndex = found.index - 1;
    } else if (direction === "down") {
      newIndex = found.index + 1;
    } else {
      return res.status(400).json({ message: "Direction must be up or down" });
    }

    const activities = found.day.activities;

    if (newIndex < 0 || newIndex >= activities.length) {
      return res.status(400).json({ message: "The activity cannot move further" });
    }

    // Swap the two activities
    const moving = activities[found.index].toObject();
    const other = activities[newIndex].toObject();
    activities.set(newIndex, moving);
    activities.set(found.index, other);

    await result.itinerary.save();

    res.json({
      message: "Activity moved",
      itinerary: result.itinerary
    });
  } catch (error) {
    sendError(res, error, "Could not move activity");
  }
});

// REMOVE ONE ACTIVITY (organiser only) - FR-4.4
router.delete("/:tripId/activities/:activityId", verifyToken, async (req, res) => {
  try {
    const result = await getEditableItinerary(req.params.tripId, req.user.id);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    const found = findActivity(result.itinerary, req.params.activityId);
    if (!found) {
      return res.status(404).json({ message: "Activity not found" });
    }

    found.day.activities.splice(found.index, 1);
    await result.itinerary.save();

    res.json({
      message: "Activity removed",
      itinerary: result.itinerary
    });
  } catch (error) {
    sendError(res, error, "Could not remove activity");
  }
});

// PLAN ONE DAY AGAIN WITH THE AI (organiser only) - FR-4.3
router.post("/:tripId/days/:dayNumber/regenerate", verifyToken, async (req, res) => {
  try {
    const result = await getEditableItinerary(req.params.tripId, req.user.id);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }

    const dayNumber = Number(req.params.dayNumber);

    // Find the day to re-plan, and keep the others
    let dayToChange = null;
    const otherDays = [];

    for (let i = 0; i < result.itinerary.days.length; i++) {
      const day = result.itinerary.days[i];
      if (day.dayNumber === dayNumber) {
        dayToChange = day;
      } else {
        otherDays.push(day);
      }
    }

    if (!dayToChange) {
      return res.status(404).json({ message: "Day not found" });
    }

    const membersResult = await getMembersForAI(result.trip);
    if (membersResult.error) {
      return res.status(400).json({ message: membersResult.error });
    }

    let instructions = "";
    if (req.body && req.body.instructions) {
      instructions = String(req.body.instructions);
    }

    // If the AI fails, nothing is changed (SRS 5.4)
    const aiResult = await regenerateDay(
      result.trip,
      result.itinerary.days.length,
      membersResult.members,
      otherDays,
      dayNumber,
      instructions
    );

    dayToChange.activities = toSavedActivities(aiResult.activities);
    await result.itinerary.save();

    res.json({
      message: "Day " + dayNumber + " planned again",
      itinerary: result.itinerary
    });
  } catch (error) {
    sendError(res, error, "Could not plan the day again");
  }
});

export default router;
