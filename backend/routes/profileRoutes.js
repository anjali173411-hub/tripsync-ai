import express from "express";
import User from "../models/User.js";
import Preference from "../models/Preference.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// VIEW MY PROFILE (FR-1.4)
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -tokenVersion");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({
      message: "Could not load profile"
    });
  }
});

// UPDATE MY PROFILE: name and default travel preferences (FR-1.4)
router.put("/", verifyToken, async (req, res) => {
  try {
    const { name, defaultInterests, defaultPace } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Name is required"
      });
    }

    // The allowed interests and paces are listed once, in the Preference model
    const allowedInterests = Preference.schema.path("interests").getEmbeddedSchemaType().enumValues;
    const allowedPaces = Preference.schema.path("pace").enumValues;

    const interests = defaultInterests || [];
    for (let i = 0; i < interests.length; i++) {
      if (!allowedInterests.includes(interests[i])) {
        return res.status(400).json({
          message: "\"" + interests[i] + "\" is not one of the interest options"
        });
      }
    }

    const pace = defaultPace || "balanced";
    if (!allowedPaces.includes(pace)) {
      return res.status(400).json({
        message: "Pace must be relaxed, balanced, or packed"
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        name: name.trim(),
        defaultPreferences: { interests: interests, pace: pace }
      },
      { new: true, runValidators: true }
    ).select("-password -tokenVersion");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      message: "Profile updated successfully",
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not update profile"
    });
  }
});

// SEARCH REGISTERED T
router.get("/search", verifyToken, async (req, res) => {
  try {
    let text = "";
    if (typeof req.query.q === "string") {
      text = req.query.q.trim();
    }

    // Need at least 2 letters, otherwise we would list everybody
    if (text.length < 2) {
      return res.json({ users: [] });
    }

    // Escape special characters so the search text is treated as plain text
    const safeText = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const users = await User.find({
      isActive: true,
      role: "traveller",
      _id: { $ne: req.user.id },
      $or: [
        { name: { $regex: safeText, $options: "i" } },
        { email: { $regex: safeText, $options: "i" } }
      ]
    })
      .select("name email")
      .limit(10);

    res.json({ users });
  } catch (error) {
    res.status(500).json({
      message: "Could not search users"
    });
  }
});

export default router;
