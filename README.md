# TripSync AI

**Plan trips together. Let AI sort the rest.**

TripSync AI is a MERN web app for planning solo and group trips. Every traveller fills in their own preferences (interests, pace, food, stay, budget). An AI service (Google Gemini) turns them into **one day-by-day itinerary** for the whole group, finds the things members disagree on, and suggests compromise options that the group **votes** on. The app also tracks the shared budget and who paid what.

**Target users:** friends, families and colleagues planning a trip together, who usually waste time in long chat threads trying to agree on a plan.

---

## Features

| Area | What it does |
|---|---|
| **Accounts** | Register, log in, log out (JWT). Logging out invalidates the token everywhere. Admin role. |
| **Trips** | Create solo or group trips (from, to, dates, travel mode train/bus/car, total budget). Archive, complete or delete. |
| **Members** | Invite anyone by email (even without an account) – they get an email with a link, sign up and accept. Search existing users. Remove members, cancel invites. |
| **Preferences** | Interests, pace, food, stay budget/type, budget contribution, must-do, deal-breakers, notes. **"Describe your ideal trip"** – the AI fills the form from a sentence. |
| **AI itinerary** | Full day plan 08:00–21:00 with breakfast, lunch, dinner, travel and hotel check-in/out; a suggested place to stay; cost check against the budget with an automatic cheaper re-plan. Re-plan one day or the whole trip with instructions. Edit, move or remove activities. |
| **Group decisions** | The AI lists conflicts with 2–3 options; members vote; an option wins with more than half of the votes, or the organiser decides. Then the organiser finalises the plan. |
| **Budget** | Add expenses by category (linked to an activity if wanted), spending vs budget, who paid what / fair share / balance, AI money-saving tips at 80% of the budget. |
| **Weather** | Forecast for near trips, last year's weather for trips further away (Open-Meteo). |
| **Admin** | Platform numbers (users, trips, solo vs group, average group size), most popular destinations, activate/deactivate users. |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite, React Router 7, Axios, Mantine 9 (UI components), lucide-react (icons) |
| Backend | Node.js + Express 5 (ES modules) |
| Database | MongoDB Atlas with Mongoose 9 |
| AI | Google Gemini (`@google/genai`) with JSON schemas, answer checking and one retry |
| Email | Brevo API online / Gmail (nodemailer) locally |
| Other APIs | Open-Meteo + Nominatim (weather and place lookup), Wikipedia (place photos) |

---

## Architecture and request flow

```
 Browser (React + Vite build)
        │  HTTPS, JSON, "Authorization: Bearer <JWT>"
        ▼
 Node.js / Express API  (/api/...)
   ├─ middleware: CORS, sanitize (blocks $ and . keys), verifyToken (JWT + tokenVersion), admin check
   ├─ routes → Mongoose models ───────────────►  MongoDB Atlas
   └─ services → Gemini (AI), Brevo/Gmail (email), Open-Meteo (weather), Wikipedia (photos)
```

Example – **generate the itinerary:** the organiser clicks *Generate* → `POST /api/trips/:tripId/generate` → the backend loads the trip and every member's preferences from MongoDB → asks Gemini for a plan in a fixed JSON shape → checks the answer (asks once more if it is broken) → saves the itinerary and the group decisions → returns them to the page.

---

## Folder structure

```
TripSyncAI/
├── package.json            build + start commands used by the hosting service
├── backend/
│   ├── server.js           Express app, CORS, routes, serves the built frontend
│   ├── config/db.js        MongoDB connection
│   ├── middleware/         auth.js (JWT, admin), sanitize.js
│   ├── models/             User, Trip, Preference, Itinerary, ConflictVote, Expense
│   ├── routes/             auth, profile, trip, member, preference, itinerary, consensus, budget, admin
│   └── services/           itineraryConsensusService (AI), emailService, weatherService, placeImageService
└── frontend/
    ├── index.html
    └── src/
        ├── main.jsx        Mantine + Router setup
        ├── theme.js        colours and font for all Mantine components
        ├── App.jsx         page routes
        ├── index.css       app styles
        ├── api/axios.js    API client (adds the token) + helpers
        ├── components/     Navbar, Sidebar, ProtectedRoute, AuthLayout
        └── pages/          Login, Register, Dashboard, CreateTrip, TripDetails, Members,
                            Preferences, Itinerary, Consensus, Budget, Profile, Admin
```

---

## Running it locally

**Requirements:** Node.js 20+, a MongoDB Atlas database, a Google Gemini API key.

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env` (never commit this file):

| Variable | Meaning |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random text used to sign login tokens |
| `PORT` | e.g. `5000` |
| `CLIENT_URL` | Where the frontend runs, e.g. `http://localhost:5173` (used for CORS) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `EMAIL_USER`, `EMAIL_PASS` | Gmail address + app password (local invite emails) |
| `BREVO_API_KEY` | *(optional)* Brevo key – used instead of Gmail when set (online) |
| `PUBLIC_APP_URL` | *(optional)* Link used in invite emails, e.g. the live site |

```bash
npm run dev        # starts the API with nodemon on PORT
```

### 2. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev        # opens on http://localhost:5173
```

### 3. Production build

```bash
cd frontend
npm run build      # creates frontend/dist
```

`frontend/.env.production` sets the API address used by the production build. It contains no secrets.

---

## Deployment (Render)

**Live app:** https://tripsync-ai-v1zw.onrender.com

The whole app runs as **one Render web service** connected to this GitHub repository. Express serves the API **and** the built React app, so the frontend and the API share one address (no CORS problems, and the frontend calls `/api`). The database is **MongoDB Atlas**.

```
Browser ──► Render web service (Node/Express) ──► MongoDB Atlas
              ├─ /api/...      → API routes
              └─ everything else → frontend/dist (React build)
```

| Render setting | Value |
|---|---|
| Build command | `npm run build` – installs backend + frontend packages and builds the React app (root `package.json`) |
| Start command | `npm start` – runs `node backend/server.js` |
| Environment variables | Set in Render's *Environment* screen (names listed below), never in the code |

- Every `git push` to `main` makes Render build and deploy the new version automatically.
- MongoDB Atlas *Network Access* allows the Render service to connect.
- Online, invite emails are sent with the **Brevo** email API, because Render blocks normal SMTP email ports.
- On the free plan the service sleeps when unused, so the first visit can take up to a minute.

The same build also runs on any Node host (for example an AWS EC2 server with Nginx in front): `npm run build`, then `npm start`.

---

## Environment variables in production

Secrets are **never** in the code or the repository – `.env` files are listed in `.gitignore`. In production the same variable names are set in the hosting service's settings (environment variables screen), with production values: the production MongoDB Atlas database, a different `JWT_SECRET`, `CLIENT_URL` set to the live frontend address (so CORS only allows that site), and `BREVO_API_KEY` for email.

---

## Main API endpoints

All endpoints start with `/api`. Everything except register/login needs `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | Accounts |
| GET / PUT | `/profile` | My profile and default preferences |
| GET / POST | `/trips` | My trips / create a trip |
| GET / DELETE | `/trips/:id` | One trip / delete it (organiser) |
| PATCH | `/trips/:id/archive`, `/trips/:id/complete` | Trip status |
| GET | `/trips/:id/weather` | Weather for the trip dates |
| POST / DELETE | `/trips/:tripId/members`, `/trips/:tripId/members/:userId` | Invite / remove members |
| POST | `/trips/:tripId/invitation/accept`, `/decline` | Answer an invitation |
| PUT / GET | `/trips/:tripId/preferences`, `/preferences/me` | Save / read my preferences |
| POST | `/trips/:tripId/preferences/from-text` | AI fills the preference form |
| POST | `/trips/:tripId/generate` | AI itinerary + group conflicts |
| GET | `/trips/:tripId/itinerary` | The itinerary and decisions |
| PUT / DELETE | `/trips/:tripId/activities/:activityId` | Edit / remove an activity |
| POST | `/trips/:tripId/days/:dayNumber/regenerate` | AI re-plans one day |
| POST | `/trips/:tripId/conflicts/:conflictId/vote`, `/resolve` | Vote / organiser decides |
| POST | `/trips/:tripId/finalise` | Lock the itinerary |
| POST / GET | `/trips/:tripId/expenses`, `/trips/:tripId/budget` | Expenses and budget summary |
| POST | `/trips/:tripId/budget/suggestions` | AI money-saving tips |
| GET / PATCH | `/admin/summary`, `/admin/users`, `/admin/users/:userId/status` | Admin dashboard |

---

## Validation, errors and security

- Every route checks required fields, types and allowed values and returns a clear `400` message; missing items return `404`; not allowed returns `403`; server errors return `500` with a safe message.
- Passwords are hashed with bcrypt; JWT login with a `tokenVersion` so logout ends all sessions.
- `sanitize` middleware removes `$` / `.` keys from requests (NoSQL injection protection).
- CORS only allows the configured frontend address.
- AI answers are validated against a JSON schema and checked (right number of days, meals, valid names); a broken answer is asked for once more, otherwise the user gets a clear error and nothing is saved.

---

## Future improvements

- Real hotel and transport booking (flights, trains, hotels) through partner APIs
- Destination pages with ratings and reviews after a trip, moderated by the admin
- AI chat assistant inside the trip
- Reminders by email or notification when a vote is needed
- Editing and deleting expenses, editing trip dates and budget after creation
- Several stay options to choose from
