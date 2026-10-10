
import express from "express";
import Review from "../models/Review.js";
import Destination from "../models/Destination.js";
import Trip from "../models/Trip.js";
import { verifyToken, adminOnly } from "../middleware/auth.js";

const router = express.Router();

// ADD A REVIEW
router.post("/", verifyToken, async (req, res) => {
  try {
    const { destinationId, tripId, rating, comment } = req.body;

    if (!destinationId || !tripId || rating === undefined) {
      return res.status(400).json({
        message: "Destination, trip and rating are required"
      });
    }

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        message: "Rating must be a whole number from 1 to 5"
      });
    }

    const trip = await Trip.findOne({
      _id: tripId,
      members: req.user.id,
      status: "completed"
    });

    if (!trip) {
      return res.status(400).json({
        message: "You must be a member of a completed trip to review"
      });
    }

    const destination = await Destination.findById(destinationId);

    if (!destination) {
      return res.status(404).json({
        message: "Destination not found"
      });
    }

    if (
      destination.name.trim().toLowerCase() !==
      trip.destination.trim().toLowerCase()
    ) {
      return res.status(400).json({
        message: "Destination does not match your trip"
      });
    }

    const review = await Review.create({
      destination: destination._id,
      trip: trip._id,
      user: req.user.id,
      rating,
      comment: comment || ""
    });

    res.status(201).json({
      message: "Review submitted successfully",
      review
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already reviewed this destination for this trip"
      });
    }

    console.error("Review error:", error);

    res.status(500).json({
      message: "Could not submit review"
    });
  }
});

// HIDE OR SHOW A REVIEW (admin only) - FR-9.3
router.patch("/:reviewId/visibility", verifyToken, adminOnly, async (req, res) => {
  try {
    const { visible } = req.body;

    if (typeof visible !== "boolean") {
      return res.status(400).json({
        message: "visible must be true or false"
      });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { visible: visible },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        message: "Review not found"
      });
    }

    res.json({
      message: visible ? "Review is visible again" : "Review hidden",
      review
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not change the review"
    });
  }
});

// REMOVE A REVIEW (admin only) - FR-9.3
router.delete("/:reviewId", verifyToken, adminOnly, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        message: "Review not found"
      });
    }

    res.json({
      message: "Review removed"
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not remove the review"
    });
  }
});

export default router;
