
import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import { sanitizeInput } from "./middleware/sanitize.js";

import Trip from "./models/Trip.js";
import Preference from "./models/Preference.js";
import Expense from "./models/Expense.js";

import authRoutes, { MIN_PASSWORD_LENGTH } from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import preferenceRoutes from "./routes/preferenceRoutes.js";
import itineraryRoutes from "./routes/itineraryRoutes.js";
import consensusRoutes from "./routes/consensusRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { CURRENCY } from "./services/itineraryConsensusService.js";

// These must be in backend/.env, otherwise the app cannot work.
// Stop straight away with a clear message if one is missing.
// (GEMINI_API_KEY is checked only when the AI is used, so the rest of
// the app still works without it.)
const REQUIRED_SETTINGS = ["MONGO_URI", "JWT_SECRET", "PORT", "CLIENT_URL"];

const missingSettings = [];
for (let i = 0; i < REQUIRED_SETTINGS.length; i++) {
  if (!process.env[REQUIRED_SETTINGS[i]]) {
    missingSettings.push(REQUIRED_SETTINGS[i]);
  }
}

if (missingSettings.length > 0) {
  console.error("Missing settings in backend/.env:", missingSettings.join(", "));
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use(sanitizeInput); // remove "$" keys from request bodies (NoSQL injection)

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    message: "TripSync AI backend is running"
  });
});

// Lists and settings the frontend needs for its forms.
// They are read from the models and code, so they are defined in only one place.
app.get("/api/options", (req, res) => {
  res.json({
    tripTypes: Trip.schema.path("type").enumValues,
    travelModes: Trip.schema.path("travelMode").enumValues,
    paceOptions: Preference.schema.path("pace").enumValues,
    foodOptions: Preference.schema.path("foodPreference").enumValues,
    stayBudgets: Preference.schema.path("stayBudget").enumValues,
    stayTypes: Preference.schema.path("stayType").enumValues,
    interestOptions: Preference.schema.path("interests").getEmbeddedSchemaType().enumValues,
    expenseCategories: Expense.schema.path("category").enumValues,
    currency: CURRENCY,
    minPasswordLength: MIN_PASSWORD_LENGTH
  });
});

// Authentication and profile
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

// Trips and members
app.use("/api/trips", tripRoutes);
app.use("/api/trips", memberRoutes);

// Preferences and itinerary
app.use("/api/trips", preferenceRoutes);
app.use("/api/trips", itineraryRoutes);

// Voting and consensus
app.use("/api/trips", consensusRoutes);

// Budget and expenses
app.use("/api/trips", budgetRoutes);

// Administrator
app.use("/api/admin", adminRoutes);

// When the app runs online, the backend also serves the finished React pages
// (the "frontend/dist" folder made by "npm run build"). On your own computer that
// folder usually doesn't exist, and the frontend runs separately with "npm run dev".
const thisFolder = path.dirname(fileURLToPath(import.meta.url));
const frontendFolder = path.join(thisFolder, "..", "frontend", "dist");

if (fs.existsSync(frontendFolder)) {
  app.use(express.static(frontendFolder));

  // Any other page address (e.g. /trips/123): send the React app,
  // and React Router shows the right page
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(frontendFolder, "index.html"));
  });
}

// Start server
async function startServer() {
  try {
    await connectDB();

    app.listen(process.env.PORT, () => {
      console.log(`TripSync AI backend running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the backend:", error.message);
    process.exit(1);
  }
}

startServer();
