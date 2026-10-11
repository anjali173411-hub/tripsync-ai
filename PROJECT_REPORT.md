# TripSync AI – AI-Powered Group Travel Planner

**Project Title:** TripSync AI – AI-Powered Group Travel Planner
**Team Members:** [Your full name]
**Project Type:** MERN Full Stack Web Application (MongoDB, Express, React, Node.js)

---

## Table of Contents

Abstract
1. Introduction
2. Problem Statement
3. User Stories
4. Flow Chart
5. Technology Stack
6. Project Structure
7. Development Environment
8. Conclusion
9. Appendix

---

## Abstract

Planning a trip with friends or family usually means long chat threads, scattered opinions and plans that suit only some people. TripSync AI is a full-stack web application that solves this by letting every traveller share their own preferences and using artificial intelligence to turn them into one fair, day-by-day itinerary for the whole group. Each member enters interests, preferred pace, food and stay preferences, budget contribution, must-do activities and things to avoid. The organiser then generates a complete plan with Google Gemini, which schedules full days with meals, travel and a suggested place to stay, checks the cost against the trip budget, and lists the points where members disagree. These conflicts become group decisions that members vote on, and the organiser finalises the plan once everything is agreed. The application also tracks shared expenses, shows who paid what, offers AI money-saving tips, shows weather for the trip dates, and lets an administrator monitor the platform. It is built with React and Vite on the frontend, Node.js and Express on the backend, MongoDB Atlas as the database, and is deployed online.

*(Word count: 181)*

---

## 1. Introduction

TripSync AI is a MERN full-stack web application (MongoDB, Express.js, React, Node.js) for planning solo and group trips with the help of artificial intelligence.

**Objectives**
- Let a user create a trip and invite other people by email, even if they do not have an account yet.
- Collect each member's travel preferences separately, in a simple form or by describing the trip in their own words.
- Use an AI service to generate a complete day-by-day itinerary that balances everyone's preferences and the group budget.
- Detect conflicts between members and let the group vote on compromise options.
- Track the shared budget and expenses, and provide an administration panel.

**Significance in full-stack development**
The project covers every layer of a modern web application:
- a **React** single-page frontend with routing, state management and form handling;
- a **REST API** built with **Node.js and Express**, with input validation, error handling, JWT authentication and role-based authorisation;
- a **MongoDB** database modelled with **Mongoose** schemas and relationships;
- integration with **external services**: an AI model (Google Gemini), an email service, and weather and place APIs;
- **deployment** to the cloud with separate development and production settings.

It shows how the frontend, backend and database work together to solve a real problem from start to finish.

---

## 2. Problem Statement

**The problem**
When a group of people plans a trip together, the planning usually happens in a group chat. Everyone has different interests, energy levels, food habits and budgets. Messages get lost, quieter members are not heard, and the final plan often suits only the most active person. Budgets are not tracked, and nobody is sure who paid for what. Existing travel apps mostly plan for one person and do not handle disagreements inside a group.

**Challenges**
- Collecting everyone's preferences in a structured way.
- Combining many different preferences into one realistic plan with times, meals, travel and a place to stay.
- Keeping the plan within a shared budget.
- Resolving disagreements fairly instead of letting one person decide.
- Making sure AI output is valid before it is saved.
- Keeping accounts and data secure.

**Opportunities and solution**
TripSync AI gives every member their own preference form, then uses one AI service to build a single itinerary for the whole group. The AI also points out where members disagree and suggests two or three compromise options. Members vote, and an option is chosen when more than half of the group agrees, or the organiser decides. The app checks the plan's cost against the budget, can automatically ask the AI for a cheaper plan, and tracks real expenses with a "who paid what" summary. This makes group trip planning faster, fairer and more organised.

---

## 3. User Stories

**User roles:** Traveller (any registered user), Organiser (the traveller who created the trip), Administrator.

**User Story 1 – Register and log in**
- **As a** new traveller,
- **I want to** create an account and log in securely,
- **So that** I can plan trips and see trips I am invited to.

*Acceptance criteria:* name, email and password are required; the password must have at least 8 characters, one capital letter and one special character; an email can only be registered once; passwords are stored hashed; after login the user is taken to their dashboard; logging out ends the session on every device.

**User Story 2 – Create a trip**
- **As an** organiser,
- **I want to** create a solo or group trip with a starting point, destination, dates, travel mode (train, bus or car) and total budget,
- **So that** the app can plan around these details.

*Acceptance criteria:* all fields are required; past dates cannot be chosen; the end date cannot be before the start date; the creator becomes the organiser and first member.
*Dependencies:* User Story 1.

**User Story 3 – Invite members**
- **As an** organiser,
- **I want to** invite people by email, even if they do not have an account yet,
- **So that** my friends can join the trip.

*Acceptance criteria:* the invited person receives an email with a link; after signing up or logging in with that email, they see the invitation on their dashboard and can accept or decline; the organiser can cancel an invitation or remove a member before the plan is finalised.
*Dependencies:* User Story 2.

**User Story 4 – Enter my preferences**
- **As a** traveller in a trip,
- **I want to** enter my interests, pace, food and stay preferences, budget contribution, must-do activities and things to avoid, or simply describe my ideal trip in a sentence,
- **So that** the plan includes what I want.

*Acceptance criteria:* the "describe your trip" option uses AI to fill in the form, which the user can check and change before saving; new trips start from the user's usual travel style from their profile; the organiser can see who has not filled in preferences yet.
*Dependencies:* User Story 3.

**User Story 5 – Generate the itinerary with AI**
- **As an** organiser,
- **I want to** generate a day-by-day plan from everyone's preferences,
- **So that** we get one plan that suits the whole group.

*Acceptance criteria:* generation is only allowed when everyone invited has answered and every member has saved preferences; each day runs from morning to night with breakfast, lunch and dinner, travel on the first and last day, and a suggested place to stay; each activity has a time, name, description and estimated cost; if the AI answer is broken, the app asks once more and shows a clear error if it still fails, without saving anything; if the plan is over budget, the app asks the AI for a cheaper plan.
*Dependencies:* User Story 4.

**User Story 6 – Change the plan**
- **As an** organiser,
- **I want to** edit, move or remove activities, or ask the AI to re-plan one day or the whole trip with instructions,
- **So that** the plan fits our group exactly.

*Acceptance criteria:* edits are saved immediately; "plan this day again" changes only that day; after finalising, the plan can no longer be changed.
*Dependencies:* User Story 5.

**User Story 7 – Vote on group decisions**
- **As a** group member,
- **I want to** vote on the compromise options for each disagreement the AI found,
- **So that** conflicts are settled fairly.

*Acceptance criteria:* each member has one vote per decision and can change it; an option is chosen automatically when more than half of the members vote for it; the organiser can also decide directly; the plan can only be finalised when all decisions are settled.
*Dependencies:* User Story 5.

**User Story 8 – Track the budget**
- **As a** traveller,
- **I want to** record expenses and see how much of the budget is used and who paid what,
- **So that** the group stays within budget and can settle up fairly.

*Acceptance criteria:* expenses have a title, amount, category and optional linked activity; the page shows the total spent against the budget, spending per category, and each member's payments, fair share and balance; when 80% of the budget is used, the user can ask the AI for money-saving tips.
*Dependencies:* User Story 2.

**User Story 9 – Administer the platform**
- **As an** administrator,
- **I want to** see platform statistics and activate or deactivate users,
- **So that** the platform stays useful and safe.

*Acceptance criteria:* only administrators can open the admin pages; statistics include total users, total trips, solo vs group trips, popular destinations and average group size; deactivated users cannot log in.

---

## 4. Flow Chart

*(Draw this in draw.io, Canva or Word shapes. Ovals = start/end, rectangles = steps, diamonds = decisions.)*

```
                    ( Start )
                        │
               [ Open TripSync AI ]
                        │
                < Has an account? > ── No ──► [ Register ] ─┐
                        │ Yes                                │
                   [ Log in ] ◄────────────────────────────┘
                        │
                < Role = Admin? > ── Yes ──► [ Admin dashboard: statistics,
                        │ No                    users, popular places ] ──► ( End )
                   [ Dashboard ]
                        │
          [ Create trip  OR  accept an invitation ]
                        │
                < Group trip? > ── Yes ──► [ Invite members by email ]
                        │ No                          │
                        ◄─────────────────────────────┘
                        │
          [ Each member saves preferences ]
                        │
     < Everyone joined and saved preferences? > ── No ──► (wait)
                        │ Yes
     [ Organiser generates itinerary with AI ]
                        │
            < AI answer valid? > ── No ──► [ Ask AI again (once) ] ──► < valid? > ── No ──► [ Show error ]
                        │ Yes
            < Over budget? > ── Yes ──► [ AI makes a cheaper plan ]
                        │ No
          [ Save itinerary + group decisions ]
                        │
            < Any conflicts? > ── Yes ──► [ Members vote / organiser decides ]
                        │ No                          │
                        ◄─────────────────────────────┘
                        │
    [ Organiser edits / re-plans if needed, then finalises ]
                        │
          [ Track expenses during the trip ]
                        │
        [ Mark the trip as completed ]
                        │
                     ( End )
```

---

## 5. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 | Building the user interface as components |
| | Vite | Fast development server and production build |
| | React Router 7 | Moving between pages (single-page application) |
| | Axios | Sending HTTP requests to the backend, adding the login token automatically |
| | HTML + CSS | Page layout and styling |
| | Mantine (a few components) | Password field with show/hide, chips, tag inputs, pop-up, loading spinner, notifications |
| | lucide-react | Icons |
| **Backend** | Node.js | JavaScript runtime for the server |
| | Express 5 | REST API: routes, middleware, error handling |
| | JSON Web Tokens (jsonwebtoken) | Login tokens and protected routes |
| | bcryptjs | Password hashing |
| | dotenv | Reading settings and secrets from environment variables |
| | cors | Allowing only the app's own website to call the API |
| **Database** | MongoDB Atlas | Cloud database |
| | Mongoose 9 | Schemas, validation and queries |
| **AI** | Google Gemini (@google/genai) | Itinerary generation, group conflicts, filling preferences from text, money-saving tips |
| **Other services** | Brevo (online) / Gmail with Nodemailer (local) | Sending invitation emails |
| | Open-Meteo and Nominatim | Weather and place lookup |
| | Wikipedia API | Destination photos for trip cards |
| **Deployment** | Render | Hosting the built frontend and the Express API as one web service |
| | GitHub | Source code and version control |

**Architecture:** React (browser) → Axios → Express REST API (`/api/...`) → Mongoose → MongoDB Atlas. The backend also calls Gemini and the other external services.

---

## 6. Project Structure

The project is split into a **backend** (API) and a **frontend** (React app).

```
TripSyncAI/
├── package.json              build and start commands for deployment
├── README.md                 overview and setup instructions
├── backend/
│   ├── server.js             creates the Express app, CORS, routes, serves the React build
│   ├── config/db.js          connects to MongoDB
│   ├── middleware/
│   │   ├── auth.js           verifyToken (JWT check) and adminOnly
│   │   └── sanitize.js       blocks NoSQL injection ($ and . keys)
│   ├── models/               Mongoose schemas
│   │   ├── User.js           account, role, default preferences, token version
│   │   ├── Trip.js           trip details, organiser, members, invited emails, status
│   │   ├── Preference.js     one member's preferences for one trip
│   │   ├── Itinerary.js      days, activities, suggested stay
│   │   ├── ConflictVote.js   group decisions, options and votes
│   │   └── Expense.js        expenses for the budget
│   ├── routes/               REST API endpoints
│   │   auth, profile, trip, member, preference, itinerary,
│   │   consensus, budget, admin
│   └── services/
│       ├── itineraryConsensusService.js   all AI features (Gemini)
│       ├── emailService.js                invitation emails
│       ├── weatherService.js              weather for the trip dates
│       └── placeImageService.js           destination photos
└── frontend/
    ├── index.html
    └── src/
        ├── main.jsx          starts React, router and theme
        ├── App.jsx           list of pages (routes)
        ├── index.css         styles
        ├── theme.js          colour and font for Mantine parts
        ├── api/axios.js      API client and helper functions
        ├── components/       Navbar, Sidebar, ProtectedRoute, AuthLayout
        └── pages/            Login, Register, Dashboard, CreateTrip, TripDetails,
                              Members, Preferences, Itinerary, Consensus,
                              Budget, Profile, Admin
```

**How a request flows:** a page calls `api.get / post / put / delete` → Express receives it at `/api/...` → `verifyToken` checks the login → the route validates the input → a Mongoose model reads or writes MongoDB (or a service calls Gemini) → JSON is sent back → React updates the screen.

---

## 7. Development Environment

| Tool | Use |
|---|---|
| **Visual Studio Code** | Code editor for frontend and backend |
| **Node.js 20 + npm** | Running the backend, installing packages, running scripts |
| **Vite dev server** (`npm run dev`) | Running the React app locally on port 5173 |
| **Nodemon** (`npm run dev` in backend) | Restarting the API automatically on changes |
| **Git + GitHub** | Version control and online repository |
| **MongoDB Atlas** | Cloud database for development and production |
| **MongoDB Atlas web console** | Viewing and checking the data |
| **Google Chrome DevTools** | Checking network requests, console errors and phone layout |
| **Render** | Online deployment; builds and runs the app on every push |
| **Google AI Studio** | Creating the Gemini API key |
| **Brevo / Gmail** | Email sending for invitations |

**Setup steps**
1. Install Node.js 20 and Git, and clone the repository.
2. In `backend/`, run `npm install` and create `backend/.env` with `MONGO_URI`, `JWT_SECRET`, `PORT`, `CLIENT_URL`, `GEMINI_API_KEY`, `EMAIL_USER` and `EMAIL_PASS`.
3. In `frontend/`, run `npm install` and create `frontend/.env` with `VITE_API_URL=http://localhost:5000/api`.
4. Run `npm run dev` in `backend/` and in `frontend/`, then open http://localhost:5173.

Secrets are kept only in `.env` files (ignored by Git) and in Render's environment settings, never in the code.

---

## 8. Conclusion

TripSync AI shows how a full-stack MERN application can solve a real everyday problem: planning a trip that suits everyone in a group. The project brings together a React frontend, an Express REST API with authentication and validation, a MongoDB database designed with Mongoose models, and an AI service that turns many people's preferences into one plan. It also handles group conflicts through voting, keeps the plan within budget, tracks shared expenses and provides an administration panel.

Building it was a strong learning experience in full-stack development: designing data models and APIs, securing them with JWT and password hashing, connecting the frontend to the backend, validating AI output before saving it, sending emails, handling errors, and deploying the application online with separate development and production settings. Problems met along the way, such as email being blocked on the hosting platform and keeping the AI's answers in a fixed format, were solved by switching to an email API and by checking every AI response against a schema.

Future improvements include destination reviews and ratings, real hotel and transport booking, an AI chat assistant inside each trip, reminders when a vote is needed, and editing expenses and trip details after creation.

---

## 9. Appendix

### Screenshots
*(Take these from the live site and label each one.)*
1. Login page
2. Sign-up page
3. Dashboard with trip cards
4. Create trip form
5. Trip details with weather
6. Members page with an invitation
7. My preferences ("Describe your ideal trip" and the form)
8. Generated itinerary (cost, stay suggestion, day-by-day activities)
9. Group decisions with voting
10. Budget page (spent vs budget, who paid what)
11. Admin dashboard
12. Invitation email

### Login Credentials
*(Create demo accounts for the reviewers – do not use your personal passwords.)*

| Role | Email | Password |
|---|---|---|
| Traveller (demo) | [demo traveller email] | [demo password] |
| Administrator (demo) | [demo admin email] | [demo password] |

### Links
- **Hosted link:** https://tripsync-ai-v1zw.onrender.com
- **Repository link:** https://github.com/anjali173411-hub/tripsync-ai
- **Recorded video (with voice explanation):** [add your video link]
