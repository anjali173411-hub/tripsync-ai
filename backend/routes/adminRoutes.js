
import express from "express";
import User from "../models/User.js";
import Trip from "../models/Trip.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// CHECK WHETHER THE USER IS AN ADMIN
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin only."
    });
  }

  next();
}

// VIEW ALL USERS
router.get("/users", verifyToken, adminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      totalUsers: users.length,
      users
    });
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      message: "Could not load users"
    });
  }
});

// VIEW PLATFORM ANALYTICS - FR-10.2
// Total users, trips (solo vs group), most popular destinations, average group size
router.get("/summary", verifyToken, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const trips = await Trip.find().select("type status destination members");

    let soloTrips = 0;
    let groupTrips = 0;
    let planningTrips = 0;
    let completedTrips = 0;
    let peopleInGroupTrips = 0;
    const destinationCounts = []; // [{ name, trips }]

    for (let i = 0; i < trips.length; i++) {
      const trip = trips[i];

      if (trip.type === "solo") {
        soloTrips = soloTrips + 1;
      } else {
        groupTrips = groupTrips + 1;
        peopleInGroupTrips = peopleInGroupTrips + trip.members.length;
      }

      if (trip.status === "planning") {
        planningTrips = planningTrips + 1;
      }
      if (trip.status === "completed") {
        completedTrips = completedTrips + 1;
      }

      // Count trips per destination (ignoring capital letters)
      const place = trip.destination.trim();
      let found = null;
      for (let j = 0; j < destinationCounts.length; j++) {
        if (destinationCounts[j].name.toLowerCase() === place.toLowerCase()) {
          found = destinationCounts[j];
        }
      }
      if (found) {
        found.trips = found.trips + 1;
      } else {
        destinationCounts.push({ name: place, trips: 1 });
      }
    }

    // Most popular first, keep the top 5
    destinationCounts.sort(function (a, b) {
      return b.trips - a.trips;
    });
    const popularDestinations = destinationCounts.slice(0, 5);

    let averageGroupSize = 0;
    if (groupTrips > 0) {
      averageGroupSize = Math.round((peopleInGroupTrips / groupTrips) * 10) / 10;
    }

    res.json({
      totalUsers: totalUsers,
      totalTrips: trips.length,
      soloTrips: soloTrips,
      groupTrips: groupTrips,
      planningTrips: planningTrips,
      completedTrips: completedTrips,
      averageGroupSize: averageGroupSize,
      popularDestinations: popularDestinations
    });
  } catch (error) {
    console.error("Admin summary error:", error);

    res.status(500).json({
      message: "Could not load analytics"
    });
  }
});

// ACTIVATE OR DEACTIVATE A USER
router.patch("/users/:userId/status",
  verifyToken,
  adminOnly,
  async (req, res) => {
    try {
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive must be true or false"
        });
      }

      if (req.params.userId === req.user.id && !isActive) {
        return res.status(400).json({
          message: "You cannot deactivate your own account"
        });
      }

      const user = await User.findByIdAndUpdate(
        req.params.userId,
        { isActive },
        { new: true, runValidators: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      res.json({
        message: isActive
          ? "User activated successfully"
          : "User deactivated successfully",
        user
      });
    } catch (error) {
      console.error("Update user status error:", error);

      res.status(500).json({
        message: "Could not update user status"
      });
    }
  }
);

export default router;
