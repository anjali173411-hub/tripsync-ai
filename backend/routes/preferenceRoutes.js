import express from "express";
import Preference from "../models/Preference.js";
import Trip from "../models/Trip.js";
import Itinerary from "../models/Itinerary.js";
import { verifyToken } from "../middleware/auth.js";
import { preferencesFromText, AIServiceError } from "../services/itineraryConsensusService.js";

const router = express.Router();

router.put("/:tripId/preferences", verifyToken, async (req, res) => {
  try {
    const {
      interests,
      otherInterests,
      pace,
      budgetContribution,
      mustDo,
      dealBreakers,
      freeTextNotes,
      foodPreference,
      stayBudget,
      stayType
    } = req.body;

    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    const isMember = trip.members.some(
      (memberId) => memberId.toString() === req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this trip"
      });
    }

    if (
      pace &&
      !["relaxed", "balanced", "packed"].includes(pace)
    ) {
      return res.status(400).json({
        message: "Pace must be relaxed, balanced, or packed"
      });
    }

    if (
      budgetContribution !== undefined &&
      (typeof budgetContribution !== "number" || budgetContribution < 0)
    ) {
      return res.status(400).json({
        message: "Budget contribution must be a positive number"
      });
    }

    const itinerary = await Itinerary.findOne({ trip: trip._id });

    if (itinerary) {
      const alreadySaved = await Preference.findOne({ trip: trip._id, user: req.user.id });

      if (alreadySaved || itinerary.status === "finalised") {
        return res.status(400).json({
          message: "The itinerary has already been generated, so preferences are locked"
        });
      }
    }

    const preference = await Preference.findOneAndUpdate(
      {
        trip: trip._id,
        user: req.user.id
      },
      {
        trip: trip._id,
        user: req.user.id,
        interests: interests || [],
        otherInterests: otherInterests || [],
        pace: pace || "balanced",
        budgetContribution: budgetContribution || 0,
        mustDo: mustDo || [],
        dealBreakers: dealBreakers || [],
        freeTextNotes: freeTextNotes || "",
        foodPreference: foodPreference || "no preference",
        stayBudget: stayBudget || "mid-range",
        stayType: stayType || "hotel"
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({
      message: "Preferences saved successfully",
      preference
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Some preference values are not allowed"
      });
    }

    console.error("Save preferences error:", error);

    res.status(500).json({
      message: "Could not save preferences"
    });
  }
});

router.post("/:tripId/preferences/from-text", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    let isMember = false;
    for (let i = 0; i < trip.members.length; i++) {
      if (trip.members[i].toString() === req.user.id) {
        isMember = true;
      }
    }

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this trip"
      });
    }

    let text = "";
    if (req.body && typeof req.body.text === "string") {
      text = req.body.text.trim();
    }

    if (text.length < 10) {
      return res.status(400).json({
        message: "Please describe your trip in a bit more detail"
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        message: "Please keep the description under 1000 characters"
      });
    }

    const choices = {
      interests: Preference.schema.path("interests").getEmbeddedSchemaType().enumValues,
      paces: Preference.schema.path("pace").enumValues,
      foods: Preference.schema.path("foodPreference").enumValues,
      stayBudgets: Preference.schema.path("stayBudget").enumValues,
      stayTypes: Preference.schema.path("stayType").enumValues
    };

    const filled = await preferencesFromText(text, choices);

    res.json({
      preferences: filled
    });
  } catch (error) {
    if (error instanceof AIServiceError) {
      return res.status(502).json({ message: error.message });
    }

    console.error("Preferences from text error:", error);
    res.status(500).json({
      message: "Could not read your description"
    });
  }
});

router.get("/:tripId/preferences/me", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    const isMember = trip.members.some(
      (memberId) => memberId.toString() === req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this trip"
      });
    }

    const preference = await Preference.findOne({
      trip: trip._id,
      user: req.user.id
    });

    res.json({ preference });
  } catch (error) {
    res.status(500).json({
      message: "Could not load preferences"
    });
  }
});

router.get("/:tripId/preferences", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    if (trip.organiser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the organiser can view all preferences"
      });
    }

    const preferences = await Preference.find({
      trip: trip._id
    }).populate("user", "name email");

    res.json({ preferences });
  } catch (error) {
    res.status(500).json({
      message: "Could not load members' preferences"
    });
  }
});

export default router;
