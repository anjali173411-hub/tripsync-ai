import express from "express";
import Trip from "../models/Trip.js";
import Itinerary from "../models/Itinerary.js";
import ConflictVote from "../models/ConflictVote.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

function listHasId(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].toString() === id.toString()) {
      return true;
    }
  }
  return false;
}

function isValidOption(conflict, optionIndex) {
  return Number.isInteger(optionIndex) && optionIndex >= 0 && optionIndex < conflict.options.length;
}

router.post("/:tripId/conflicts/:conflictId/vote", verifyToken, async (req, res) => {
  try {
    const { optionIndex } = req.body;

    const trip = await Trip.findById(req.params.tripId);

    if (!trip || !listHasId(trip.members, req.user.id)) {
      return res.status(404).json({
        message: "Trip not found or access denied"
      });
    }

    const itinerary = await Itinerary.findOne({ trip: trip._id });

    if (itinerary && itinerary.status === "finalised") {
      return res.status(400).json({
        message: "Voting is closed because the itinerary is finalised"
      });
    }

    const conflict = await ConflictVote.findOne({
      _id: req.params.conflictId,
      trip: trip._id
    });

    if (!conflict) {
      return res.status(404).json({
        message: "Conflict not found"
      });
    }

    if (conflict.resolved) {
      return res.status(400).json({
        message: "This conflict has already been resolved"
      });
    }

    if (!isValidOption(conflict, optionIndex)) {
      return res.status(400).json({
        message: "Choose a valid option"
      });
    }

    const otherVotes = [];
    for (let i = 0; i < conflict.votes.length; i++) {
      if (conflict.votes[i].user.toString() !== req.user.id) {
        otherVotes.push(conflict.votes[i]);
      }
    }
    otherVotes.push({ user: req.user.id, optionIndex: optionIndex });
    conflict.votes = otherVotes;

    conflict.recountVotes();

    if (conflict.options[optionIndex].voteCount > trip.members.length / 2) {
      conflict.resolved = true;
      conflict.chosenOption = optionIndex;
    }

    await conflict.save();

    res.json({
      message: conflict.resolved
        ? "Vote saved. A majority was reached and the option is locked in."
        : "Vote saved",
      conflict: conflict
    });
  } catch (error) {
    console.error("Conflict vote error:", error);
    res.status(500).json({
      message: "Could not save vote"
    });
  }
});

router.post("/:tripId/conflicts/:conflictId/resolve", verifyToken, async (req, res) => {
  try {
    const { optionIndex } = req.body;

    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    if (trip.organiser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the organiser can resolve conflicts"
      });
    }

    const itinerary = await Itinerary.findOne({ trip: trip._id });

    if (itinerary && itinerary.status === "finalised") {
      return res.status(400).json({
        message: "A finalised itinerary cannot be changed"
      });
    }

    const conflict = await ConflictVote.findOne({
      _id: req.params.conflictId,
      trip: trip._id
    });

    if (!conflict) {
      return res.status(404).json({
        message: "Conflict not found"
      });
    }

    if (!isValidOption(conflict, optionIndex)) {
      return res.status(400).json({
        message: "Choose a valid option"
      });
    }

    conflict.resolved = true;
    conflict.chosenOption = optionIndex;
    await conflict.save();

    res.json({
      message: "Conflict resolved by organiser",
      conflict: conflict
    });
  } catch (error) {
    console.error("Resolve conflict error:", error);
    res.status(500).json({
      message: "Could not resolve conflict"
    });
  }
});

router.post("/:tripId/finalise", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    if (trip.organiser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the organiser can finalise the itinerary"
      });
    }

    const itinerary = await Itinerary.findOne({ trip: trip._id });

    if (!itinerary) {
      return res.status(404).json({
        message: "Generate an itinerary first"
      });
    }

    if (itinerary.status === "finalised") {
      return res.status(400).json({
        message: "Itinerary is already finalised"
      });
    }

    const conflicts = await ConflictVote.find({ trip: trip._id });

    const unresolvedConflicts = [];
    for (let i = 0; i < conflicts.length; i++) {
      if (!conflicts[i].resolved) {
        unresolvedConflicts.push(conflicts[i].conflictDescription);
      }
    }

    if (unresolvedConflicts.length > 0) {
      return res.status(400).json({
        message: "Every conflict must be resolved before finalisation",
        unresolvedConflicts: unresolvedConflicts
      });
    }

    itinerary.status = "finalised";
    await itinerary.save();

    trip.status = "finalised";
    await trip.save();

    res.json({
      message: "Itinerary finalised successfully",
      itinerary: itinerary
    });
  } catch (error) {
    console.error("Finalise itinerary error:", error);
    res.status(500).json({
      message: "Could not finalise itinerary"
    });
  }
});

export default router;
