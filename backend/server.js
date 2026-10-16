import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";

import Trip from "./models/Trip.js";
import Preference from "./models/Preference.js";
import Expense from "./models/Expense.js";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import preferenceRoutes from "./routes/preferenceRoutes.js";
import itineraryRoutes from "./routes/itineraryRoutes.js";
import consensusRoutes from "./routes/consensusRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { CURRENCY } from "./services/itineraryConsensusService.js";

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

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

function cleanObject(value) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = cleanObject(value[i]);
    }
    return value;
  }

  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key.startsWith("$") || key.includes(".")) {
        delete value[key];
      } else {
        value[key] = cleanObject(value[key]);
      }
    }
  }

  return value;
}

app.use((req, res, next) => {
  if (req.body) {
    req.body = cleanObject(req.body);
  }
  next();
});

app.get("/api/health", (req, res) => {
  res.json({
    message: "TripSync AI backend is running"
  });
});

app.get("/api/options", (req, res) => {
  res.json({
    tripTypes: Trip.schema.path("type").enumValues,
    travelModes: Trip.schema.path("travelMode").enumValues,
    paceOptions: Preference.schema.path("pace").enumValues,
    foodOptions: Preference.schema.path("foodPreference").enumValues,
    stayBudgets: Preference.schema.path("stayBudget").enumValues,
    interestOptions: Preference.schema.path("interests").getEmbeddedSchemaType().enumValues,
    expenseCategories: Expense.schema.path("category").enumValues,
    currency: CURRENCY
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

app.use("/api/trips", tripRoutes);
app.use("/api/trips", memberRoutes);

app.use("/api/trips", preferenceRoutes);
app.use("/api/trips", itineraryRoutes);

app.use("/api/trips", consensusRoutes);

app.use("/api/trips", budgetRoutes);

app.use("/api/admin", adminRoutes);

const thisFolder = path.dirname(fileURLToPath(import.meta.url));
const frontendFolder = path.join(thisFolder, "..", "frontend", "dist");

if (fs.existsSync(frontendFolder)) {
  app.use(express.static(frontendFolder));

  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(frontendFolder, "index.html"));
  });
}

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
