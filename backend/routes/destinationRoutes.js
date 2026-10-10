
import express from "express";
import Destination from "../models/Destination.js";
import Review from "../models/Review.js";
import { verifyToken, adminOnly } from "../middleware/auth.js";

const router = express.Router();

// Takes the destination fields from the request and checks them.
// Returns { data } or { error }.
function readDestinationForm(body) {
  const { name, location, description, averageCostTier, images } = body;

  if (!name || !String(name).trim()) {
    return { error: "Destination name is required" };
  }

  const allowedTiers = Destination.schema.path("averageCostTier").enumValues;
  const tier = averageCostTier || "mid-range";

  if (!allowedTiers.includes(tier)) {
    return { error: "Cost tier must be one of: " + allowedTiers.join(", ") };
  }

  // Keep only non-empty image links
  const imageList = [];
  if (Array.isArray(images)) {
    for (let i = 0; i < images.length; i++) {
      const link = String(images[i]).trim();
      if (link !== "") {
        imageList.push(link);
      }
    }
  }

  return {
    data: {
      name: String(name).trim(),
      location: location ? String(location) : "",
      description: description ? String(description) : "",
      averageCostTier: tier,
      images: imageList
    }
  };
}

// VIEW ALL DESTINATIONS, with their average rating (FR-9.2)
router.get("/", verifyToken, async (req, res) => {
  try {
    const destinations = await Destination.find().sort({ name: 1 });

    // Only visible reviews count towards the rating
    const reviews = await Review.find({ visible: true }).select("destination rating");

    const list = [];
    for (let i = 0; i < destinations.length; i++) {
      const destination = destinations[i];

      let total = 0;
      let count = 0;
      for (let j = 0; j < reviews.length; j++) {
        if (reviews[j].destination.toString() === destination._id.toString()) {
          total = total + reviews[j].rating;
          count = count + 1;
        }
      }

      let averageRating = 0;
      if (count > 0) {
        averageRating = Math.round((total / count) * 10) / 10; // one decimal, e.g. 4.3
      }

      const item = destination.toObject();
      item.averageRating = averageRating;
      item.reviewCount = count;
      list.push(item);
    }

    res.json({ destinations: list });
  } catch (error) {
    res.status(500).json({
      message: "Could not load destinations"
    });
  }
});

// ADD A DESTINATION (admin only) - FR-10.1
router.post("/", verifyToken, adminOnly, async (req, res) => {
  try {
    const form = readDestinationForm(req.body);
    if (form.error) {
      return res.status(400).json({ message: form.error });
    }

    const destination = await Destination.create(form.data);

    res.status(201).json({
      message: "Destination added successfully",
      destination
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Destination already exists"
      });
    }

    res.status(500).json({
      message: "Could not add destination"
    });
  }
});

// EDIT A DESTINATION (admin only) - FR-10.1
router.put("/:destinationId", verifyToken, adminOnly, async (req, res) => {
  try {
    const form = readDestinationForm(req.body);
    if (form.error) {
      return res.status(400).json({ message: form.error });
    }

    const destination = await Destination.findByIdAndUpdate(
      req.params.destinationId,
      form.data,
      { new: true, runValidators: true }
    );

    if (!destination) {
      return res.status(404).json({
        message: "Destination not found"
      });
    }

    res.json({
      message: "Destination updated",
      destination
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Another destination already has this name"
      });
    }

    res.status(400).json({
      message: "Could not update destination"
    });
  }
});

// REMOVE A DESTINATION AND ITS REVIEWS (admin only) - FR-10.1
router.delete("/:destinationId", verifyToken, adminOnly, async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.destinationId);

    if (!destination) {
      return res.status(404).json({
        message: "Destination not found"
      });
    }

    await Review.deleteMany({ destination: destination._id });
    await Destination.deleteOne({ _id: destination._id });

    res.json({
      message: "Destination removed"
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not remove destination"
    });
  }
});

// VIEW REVIEWS FOR A DESTINATION (FR-9.2)
// Travellers see only visible reviews; admins see all, so they can moderate (FR-9.3).
router.get("/:destinationId/reviews", verifyToken, async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.destinationId);

    if (!destination) {
      return res.status(404).json({
        message: "Destination not found"
      });
    }

    const filter = { destination: destination._id };
    if (req.user.role !== "admin") {
      filter.visible = true;
    }

    const reviews = await Review.find(filter)
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.json({ destination, reviews });
  } catch (error) {
    res.status(400).json({
      message: "Could not load reviews"
    });
  }
});

export default router;
