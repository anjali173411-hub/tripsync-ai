import express from "express";
import Trip from "../models/Trip.js";
import Preference from "../models/Preference.js";
import Itinerary from "../models/Itinerary.js";
import ConflictVote from "../models/ConflictVote.js";
import Expense from "../models/Expense.js";
import { verifyToken } from "../middleware/auth.js";
import { findPlace, getWeatherForDates } from "../services/weatherService.js";
import { findPlaceImage } from "../services/placeImageService.js";

const PHOTOS_PER_LOAD = 3;

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      title,
      type,
      startingFrom,
      destination,
      travelMode,
      startDate,
      endDate,
      budget
    } = req.body;

    if (
      !title ||
      !type ||
      !startingFrom ||
      !destination ||
      !travelMode ||
      !startDate ||
      !endDate ||
      budget === undefined
    ) {
      return res.status(400).json({
        message: "Please provide all trip details"
      });
    }

    const allowedTravelModes = Trip.schema.path("travelMode").enumValues;

    if (!allowedTravelModes.includes(travelMode)) {
      return res.status(400).json({
        message: "Please choose how you are travelling"
      });
    }

    if (!["solo", "group"].includes(type)) {
      return res.status(400).json({
        message: "Trip type must be solo or group"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end < start
    ) {
      return res.status(400).json({
        message: "Please provide valid trip dates"
      });
    }

    if (
      typeof budget !== "number" ||
      !Number.isFinite(budget) ||
      budget < 0
    ) {
      return res.status(400).json({
        message: "Budget must be a non-negative number"
      });
    }

    const trip = await Trip.create({
      title,
      type,
      startingFrom,
      destination,
      travelMode,
      startDate: start,
      endDate: end,
      budget,
      organiser: req.user.id,
      members: [req.user.id]
    });

    trip.destinationImage = await findPlaceImage(destination);
    await trip.save();

    res.status(201).json({
      message: "Trip created successfully",
      trip
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not create trip"
    });
  }
});

router.get("/", verifyToken, async (req, res) => {
  try {
    const trips = await Trip.find({
      members: req.user.id
    })
      .populate("organiser", "name email")
      .populate("members", "name email")
      .sort({ createdAt: -1 });

    let looked = 0;
    for (let i = 0; i < trips.length; i++) {
      const trip = trips[i];
      if (trip.destinationImage === null && looked < PHOTOS_PER_LOAD) {
        looked = looked + 1;
        const photo = await findPlaceImage(trip.destination);
        if (photo !== null) {
          trip.destinationImage = photo;
          await Trip.updateOne({ _id: trip._id }, { destinationImage: photo });
        }
      }
    }

    res.json({ trips });
  } catch (error) {
    res.status(500).json({
      message: "Could not load trips"
    });
  }
});

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      members: req.user.id
    })
      .populate("organiser", "name email")
      .populate("members", "name email");

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    res.json({ trip });
  } catch (error) {
    res.status(400).json({
      message: "Invalid trip ID or request"
    });
  }
});

router.get("/:id/weather", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      members: req.user.id
    });

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    if (trip.destinationLat === null || trip.destinationLon === null) {
      const place = await findPlace(trip.destination);

      if (!place) {
        return res.status(404).json({
          message: "Could not find \"" + trip.destination + "\" on the map, so weather is not available"
        });
      }

      trip.destinationLat = place.lat;
      trip.destinationLon = place.lon;
      trip.destinationFullName = place.fullName;
      await trip.save();
    }

    const weather = await getWeatherForDates(
      { lat: trip.destinationLat, lon: trip.destinationLon },
      trip.startDate,
      trip.endDate
    );

    res.json({
      place: trip.destinationFullName,
      type: weather.type,
      days: weather.days
    });
  } catch (error) {
    console.error("Weather error:", error.message);

    res.status(502).json({
      message: "Weather is not available right now. Please try again later."
    });
  }
});

router.patch("/:id/complete", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    if (trip.organiser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the organiser can complete the trip"
      });
    }

    if (trip.status !== "finalised") {
      return res.status(400).json({
        message: "Only a finalised trip can be marked as completed"
      });
    }

    trip.status = "completed";
    await trip.save();

    res.json({
      message: "Trip marked as completed",
      trip
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not complete trip"
    });
  }
});

router.patch("/:id/archive", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    if (trip.organiser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the organiser can archive the trip"
      });
    }

    trip.status = "archived";
    await trip.save();

    res.json({
      message: "Trip archived",
      trip
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not archive trip"
    });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    if (trip.organiser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the organiser can delete the trip"
      });
    }

    await Preference.deleteMany({ trip: trip._id });
    await Itinerary.deleteMany({ trip: trip._id });
    await ConflictVote.deleteMany({ trip: trip._id });
    await Expense.deleteMany({ trip: trip._id });
    await Trip.deleteOne({ _id: trip._id });

    res.json({
      message: "Trip deleted"
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not delete trip"
    });
  }
});

export default router;
