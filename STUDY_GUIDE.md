# TripSync AI – Study Guide (read from top to bottom)

> **How to read this in VS Code:** open this file and press **Ctrl + Shift + V**.
> Keep the real code file open next to it. Every section says which file and lines to look at.

**Order:**
0. The big picture
1. Login – the frontend (LoginPage, axios.js)
2. How pages connect (App.jsx, ProtectedRoute)
3. Login – the backend (User model, authRoutes, verifyToken)
4. Loading data (Dashboard + trip routes)
5. The main feature: AI itinerary
6. All other pages = the same pattern
7. Practice: write it yourself
8. Answers for the review

---

## 0. The big picture (read this first)

```
React page (frontend)  ──Axios request──►  Express route (backend)  ──Mongoose──►  MongoDB Atlas
   what you see                              checks + logic                          stores data
       ▲                                           │
       └──────────────── JSON answer ◄─────────────┘
```

- **Frontend** = `frontend/src` – what the user sees and clicks (React, plain HTML + CSS, a few Mantine parts).
- **Backend** = `backend` – gets requests, checks them, reads/writes the database, calls the AI (Express).
- **Database** = MongoDB Atlas – users, trips, preferences, itineraries, votes, expenses.

**Say it like this:** *"The page sends a request with Axios. The Express backend checks it, uses Mongoose to read or write MongoDB, and sends JSON back. React shows it on the screen."*

---

## 1. Login – the frontend

### 1a. `frontend/src/pages/LoginPage.jsx`

**Imports (top of the file)** – bring in the tools:
| Import | Used for |
|---|---|
| `useState` (React) | remembering what the user types |
| `Link, Navigate, useNavigate, useLocation` (React Router) | moving between pages |
| `PasswordInput` (Mantine) | the password box with the 👁 show-password button |
| `AuthLayout` | our split-screen design |
| `api, saveLogin, getCurrentUser, getErrorMessage` | our helpers in `api/axios.js` |

**A page is just a function** that returns what to show: `function LoginPage() { ... return (...) }`

**State – what the page remembers:**
```jsx
const [email, setEmail] = useState("");        // what's in the email box
const [password, setPassword] = useState("");
const [error, setError] = useState("");        // red error message (none at first)
```
Pattern: `[value, function to change it] = useState(start value)`.
**Key idea:** calling `setEmail(...)` makes React **re-draw the screen** with the new value.

**Already logged in? Skip the form:**
```jsx
const loggedInUser = getCurrentUser();          // reads localStorage
if (loggedInUser) {
  return <Navigate to={loggedInUser.role === "admin" ? "/admin" : "/"} />;
}
```
`a ? b : c` means "if a then b, otherwise c".

**Clicking "Log in" – `handleLogin` (the most important part):**
```jsx
async function handleLogin(event) {
  event.preventDefault();   // ① a form normally reloads the page – stop that
  setError("");             // ② clear the old error

  try {
    const response = await api.post("/auth/login", { email: email, password: password });  // ③
    saveLogin(response.data.token, response.data.user);                                   // ④
    navigate(response.data.user.role === "admin" ? "/admin" : "/");                       // ⑤
  } catch (err) {
    setError(getErrorMessage(err));   // ⑥ show the backend's error in red
  }
}
```
- ③ send email + password to **POST /api/auth/login**; `await` = wait for the answer
- ④ the backend sends a **token** (digital pass) + the **user** → saved in **localStorage**
- ⑤ go to the right page
- ⑥ wrong password → backend answers 401 "Invalid email or password" → `catch` shows it
- **try / catch** = "try this; if anything fails, run catch instead of crashing"

**The screen (`return`):**
```jsx
{location.state && location.state.message && <p className="success-box">{location.state.message}</p>}
<form onSubmit={handleLogin}>                     // Enter or button → handleLogin
  <label>Email</label>
  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
  <label>Password</label>
  <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
  {error && <p className="error-box">{error}</p>}   // && = show ONLY if there is an error
  <button type="submit" className="full-width">Log in</button>
</form>
```
- The first line shows "Account created! Please log in." – the Register page sends it after signing up.
- `className="error-box"` = the look comes from **index.css** (`.error-box { background: ...; color: ... }`).

Two patterns used on **every** page:
1. **`value` + `onChange`** = controlled input: the box and the state are always the same.
2. **`{something && <X />}`** = show X only when something is true.

✅ **Check yourself:** *"Typing saves the text in state. Clicking Log in runs handleLogin, which sends the email and password to /api/auth/login. If correct, we save the token in localStorage and go to the dashboard; if wrong, catch shows the error in red."*

### 1b. `frontend/src/api/axios.js` – how the frontend talks to the backend

```js
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
```
One Axios object for the whole app. `VITE_API_URL` comes from `frontend/.env` (`http://localhost:5000/api` locally, `/api` online). So `api.post("/auth/login")` really goes to `.../api/auth/login`.

**Before EVERY request – add the token:**
```js
api.interceptors.request.use(function (config) {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});
```
That's why pages never add the token themselves – it happens automatically.

**After EVERY answer – handle "logged out":**
```js
if (error.response.status === 401 && we were logged in) { logout(); window.location.href = "/login"; }
```
If the token expired or the user logged out somewhere else, we clear the login and go to the login page.

**Helpers:**
| Function | Does |
|---|---|
| `getErrorMessage(err)` | takes the `message` the backend sent, or a general message |
| `saveLogin(token, user)` | stores both in localStorage |
| `getCurrentUser()` | reads the user back (or `null` if not logged in) |
| `logout()` | removes them from this browser |
| `logoutEverywhere()` | calls `POST /auth/logout` (all old tokens stop working), then `logout()` |
| `formatDate`, `formatDateRange`, `formatMoney`, `travelModeText` | turn data into nice text |

---

## 2. How pages connect

### `frontend/src/App.jsx`
```jsx
<Routes>
  <Route path="/login" element={<LoginPage />} />                               // anyone
  <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />     // logged in
  <Route path="/trips/:tripId/budget" element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
  <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
  <Route path="*" element={<Navigate to="/" />} />                               // unknown address
</Routes>
```
- Each `Route` = "this address shows this page".
- `:tripId` is a placeholder – inside the page, `const { tripId } = useParams();` reads the real id.
- `{!isAuthPage && <Navbar />}` – no top bar on login / sign-up.
- `HomePage` – admins go to `/admin`, travellers see the Dashboard.

### `frontend/src/components/ProtectedRoute.jsx`
```jsx
const user = getCurrentUser();
if (!user) return <Navigate to="/login" />;                                // not logged in
if (props.adminOnly && user.role !== "admin") return <Navigate to="/" />;  // not an admin
return props.children;                                                     // OK: show the page
```
`props.children` = whatever is written between `<ProtectedRoute>` and `</ProtectedRoute>`.

---

## 3. Login – the backend

### 3a. `backend/models/User.js` – what a user looks like
```js
const userSchema = new mongoose.Schema({ ...fields... }, { timestamps: true });
const User = mongoose.model("User", userSchema);
```
- **Schema** = the rules every user must follow. **Model** = the tool to find / create / update users (`users` collection).

| Field | Rule | Why |
|---|---|---|
| `name` | String, required, trim | must exist; `trim` removes outer spaces |
| `email` | required, **unique**, lowercase, trim | no two accounts per email; "Asha@X.com" = "asha@x.com" |
| `password` | String, required | stores the **hash**, never the real password |
| `role` | enum `traveller` / `admin`, default traveller | only these values allowed |
| `isActive` | Boolean, default true | admin can deactivate (FR-10) |
| `defaultPreferences` | interests + pace | pre-fills preferences for new trips (FR-1.4) |
| `tokenVersion` | Number, default 0 | for "log out everywhere" |
| `timestamps: true` | | adds `createdAt`, `updatedAt` |

### 3b. `backend/routes/authRoutes.js`

**Top of the file:**
```js
const router = express.Router();     // a group of routes; server.js mounts it at /api/auth
export const MIN_PASSWORD_LENGTH = 8;
const SALT_ROUNDS = 10;              // hashing strength
const TOKEN_EXPIRES_IN = "1d";       // login lasts 1 day
```
`router.post("/login")` + `app.use("/api/auth", authRoutes)` in server.js = **POST /api/auth/login**.

**Every route has this skeleton:**
```js
router.post("/something", async (req, res) => {
  try {
    // 1. read input (req.body)  2. check it  3. use the database  4. send the answer (res.json)
  } catch (error) {
    res.status(500).json({ message: "..." });   // anything unexpected
  }
});
```
- `req` = what the browser sent (`req.body` = the JSON). `res` = our answer.
- `res.status(400).json({ message })` = status code + message. `return` stops the function.

**REGISTER – `POST /api/auth/register`:**
1. `const { name, email, password } = req.body;` – take the 3 values out (destructuring)
2. `typeof ... !== "string"` → 400. **Why?** Security: an attacker could send `{"$gt": ""}` instead of text, which MongoDB reads as "anything" (**NoSQL injection**).
3. empty → 400; password shorter than 8 → 400
4. `User.findOne({ email: email.toLowerCase().trim() })` → if found → **409** "Email already registered"
5. `bcrypt.hash(password, 10)` – **hash** the password (one-way: can't be turned back; random *salt* so equal passwords give different hashes)
6. `User.create({ name, email, password: hashedPassword })` → **201** + the user **without** the password

**LOGIN – `POST /api/auth/login`:**
1. read + check type + check empty (same as register)
2. `User.findOne({ email: ...lowercase.trim })`; no user or `!user.isActive` → **401** "Invalid email or password"
   – **same message** for wrong email and wrong password, so attackers can't find out which emails exist
3. `bcrypt.compare(password, user.password)` – hashes the typed password the same way and compares → true/false; false → 401
4. make the token:
   ```js
   const token = jwt.sign(
     { id: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion },  // inside the token
     process.env.JWT_SECRET,                                                        // secret key (.env)
     { expiresIn: "1d" }
   );
   ```
   **JWT** = a signed "entry pass". Anyone can read what's inside, but nobody can change it without the secret – so the server can trust it on every later request without asking for the password.
5. `res.json({ message, token, user: { id, name, email, role } })`

**LOGOUT – `POST /api/auth/logout`:**
```js
router.post("/logout", verifyToken, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });   // 0 → 1
  res.json({ message: "Logged out" });
});
```
- `verifyToken` runs **first** (middleware) – only logged-in users get here.
- Old tokens still say `tokenVersion: 0`, the database now says 1 → they stop working on **every** device (FR-1.6).

**`GET /api/auth/me`** – the logged-in user; `.select("-password")` = everything except the password.

### 3c. `backend/middleware/auth.js` – the guard on protected routes

**Middleware** = runs between the request and the route; gets `(req, res, next)`; `next()` = "continue".

```js
export async function verifyToken(req, res, next) {
  // ① header must look like:  Authorization: Bearer eyJhbGci...
  if (!authHeader || !authHeader.startsWith("Bearer ")) → 401 "Please log in first"
  // ② "Bearer abc".split(" ")[1] → "abc"
  // ③ jwt.verify(token, JWT_SECRET) – real and not expired?   else → 401 "Invalid or expired token"
  // ④ find the user: not found / not active → 401;  tokenVersion different → 401 "You have been logged out"
  // ⑤ req.user = { id, role };  next();
}
```
Every protected route then uses **`req.user.id`** to know who is asking.

```js
export function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}
```
Used like `router.get("/users", verifyToken, adminOnly, async (req, res) => {...})` – checks run in order.

**Status codes:**
| Code | Meaning | Example |
|---|---|---|
| 200 | OK | login worked |
| 201 | Created | registered, trip created |
| 400 | Bad input | missing field, short password |
| 401 | Not logged in / wrong login | wrong password, no token, logged out |
| 403 | Logged in but not allowed | non-admin on admin page, non-organiser generating |
| 404 | Not found | trip doesn't exist |
| 409 | Already exists | email already registered |
| 500 | Server error | something unexpected (inside `catch`) |

---

## 4. Loading data – Dashboard + trip routes

### `frontend/src/pages/DashboardPage.jsx`
```jsx
const [trips, setTrips] = useState([]);
const [loading, setLoading] = useState(true);   // true: the trips haven't arrived yet

useEffect(() => {          // runs ONCE when the page opens (because of the empty [])
  loadPage();
}, []);

async function loadPage() {
  const tripsResponse = await api.get("/trips");      // GET /api/trips
  setTrips(tripsResponse.data.trips);                 // → screen re-draws with the trips
  ... invitations and currency the same way ...
  setLoading(false);                                  // done → hide the spinner
}
```
- While `loading` is true the page shows a spinner: `if (loading) return <div className="center-box"><Loader /></div>;`
- `{activeTrips.map((trip) => drawTripCard(trip))}` – **`.map` draws one card per trip**.
- `drawTripCard(trip)` returns one card: the photo (`trip.destinationImage`), the name, dates, people and budget.
- **Accept** an invitation → `api.post("/trips/" + tripId + "/invitation/accept")` → `loadPage()` again to refresh.
- **Decline** → `window.confirm("Decline this invitation?")` first (the browser's OK / Cancel box).

### `backend/routes/tripRoutes.js`
**GET /api/trips – my trips:**
```js
router.get("/", verifyToken, async (req, res) => {
  const trips = await Trip.find({ members: req.user.id })   // only trips I am a member of
    .populate("organiser", "name email")                    // replace the id with name + email
    .populate("members", "name email")
    .sort({ createdAt: -1 });                               // newest first
  res.json({ trips });
});
```
**POST /api/trips – create a trip:** read `title, type, startingFrom, destination, travelMode, startDate, endDate, budget` → check all are present, travel mode is allowed, dates valid, budget ≥ 0 → `Trip.create({ ..., organiser: req.user.id, members: [req.user.id] })` → 201.
The creator becomes the **organiser** and the first **member**.

**GET /api/trips/:id** – `Trip.findOne({ _id: req.params.id, members: req.user.id })` – you can only open trips you belong to; otherwise 404.

✅ **Now you know the whole pattern:** *load* = `useEffect` + `api.get`; *save* = `handle…` + `api.post/put/delete`; *backend* = `verifyToken` → check → model → `res.json`.

---

## 5. The main feature – AI itinerary

**Flow:**
```
PreferencesPage (each member saves preferences)
        │  PUT /api/trips/:tripId/preferences
        ▼
ItineraryPage – organiser clicks "Generate with AI"
        │  POST /api/trips/:tripId/generate
        ▼
itineraryRoutes.js → checks → itineraryConsensusService.generateItinerary() → Gemini AI
        │                                       (checks the answer, asks again once if broken)
        ▼
saves Itinerary + ConflictVote (group decisions) in MongoDB → JSON back → page shows the plan
```

### `frontend/src/pages/ItineraryPage.jsx` – only these parts
- **`loadPage()`** – `GET /trips/:tripId` (trip) and `GET /trips/:tripId/itinerary` (plan + decisions). A **404** just means "no plan yet" → shows the *Generate with AI* button.
- **`planTrip(instructionsText)`** – `POST /trips/:tripId/generate`; used by *Generate*, *Plan trip again* and *Make it cheaper* (only the instructions differ). While waiting, `aiWorking` is true and the page shows "The AI is planning your trip...".
- **Cost maths:** `totalCost = activities per person × number of people + stay per night × nights`; if `totalCost > trip.budget` the organiser sees **Make it cheaper with AI**.
- **Screen:** the cost box → the stay box → one **button per day** (`selectedDay` state) → the activities of that day as a list (time · name · cost) → for the organiser, small buttons **Edit / Earlier / Later / Remove**.
- **Edit** opens a small pop-up (Mantine `Modal`) with the time, name, description and cost → `PUT /activities/:id`.
- **Remove / Finalise** ask first with `window.confirm(...)`.
- **"Doesn't match: Ravi"** is shown only when an activity doesn't suit someone (`getNotMatched`, FR-5.6).

### `backend/routes/itineraryRoutes.js` → `POST /:tripId/generate`
1. trip exists? (404) – you are the **organiser**? (403)
2. not already finalised, trip in planning, dates valid (400)
3. nobody still invited and not answered (400 "Still waiting for …")
4. `getMembersForAI(trip)` – every member's preferences (400 if someone hasn't filled them in)
5. `generateItinerary(trip, numberOfDays, members, instructions)` – **the AI call**
6. turn the AI days into real dates, save with `Itinerary.findOneAndUpdate(..., { upsert: true })` (create or replace)
7. delete old `ConflictVote`s, create new ones (one per conflict, votes empty)
8. `res.json({ itinerary, conflicts })`
If the AI fails → it throws → `catch` → error message, **nothing is saved**.

### `backend/services/itineraryConsensusService.js` – just the idea
- **One AI service for solo and group trips** (reviewer's correction: merged itinerary + consensus).
- `SYSTEM_PROMPT` = the rules for Gemini (08:00–21:00 days, 3 meals, travel on first/last day, stay, budget is for the whole group, conflicts with 2–3 options).
- `ITINERARY_SHAPE` = a **JSON schema** – Gemini must answer in exactly this shape.
- `askUntilValid()` = ask → **check the answer** (`checkAIReply`: right number of days, meals, valid names, ≥ 2 options per conflict) → if wrong, tell Gemini the problems and **ask once more** → still wrong → error (**FR-4.6**, malformed AI output).
- `generateItinerary()` = make the plan; if it costs more than the budget, **automatically ask for a cheaper plan** and keep the cheaper one.
- If the daily AI limit is reached, it switches to a backup (lighter) Gemini model.

---

## 6. All other pages = the same pattern

For each page find: **① state → ② loadPage (GET) → ③ handle… (POST/PUT/DELETE) → ④ return (screen)**.

| Page | Loads | Saves | Special thing |
|---|---|---|---|
| RegisterPage | password rule (`/options`) | `POST /auth/register` | goes to login with a message |
| CreateTripPage | choices (`/options`) | `POST /trips` | `<input type="date" min={today}>` blocks past dates |
| TripDetailsPage | trip + weather | archive / delete / complete | photo banner, weather for each day |
| MembersPage | trip + who filled preferences | invite, cancel invite, remove | invite by email (Brevo/Gmail) |
| PreferencesPage | options + my saved preferences | `PUT /preferences` | "Describe your trip" → AI fills the form |
| ConsensusPage | trip + decisions | vote / organiser decides | more than half of the votes wins |
| BudgetPage | budget summary + expenses | `POST /expenses` | spent bar, by category, who paid what, AI tips at 80% |
| ProfilePage | my profile | `PUT /profile` | default interests and pace |
| AdminPage | summary + users | activate / deactivate | admin only |

**"Are you sure?"** – every page uses the browser's own box:
```jsx
if (!window.confirm("Delete this trip for everyone?")) {
  return;            // the user clicked Cancel → stop
}
// the user clicked OK → continue and delete
```
**Success message:** `notifications.show({ message: "Saved", color: "green" });` – a small message in the corner (Mantine).

**Where the look comes from:** plain HTML with class names, e.g. `<div className="box">`, and the styles in `index.css`:
| Class | Looks like |
|---|---|
| `box` | white box with rounded corners |
| `label` | small grey capital heading |
| `tag`, `tag green`, `tag orange` | small rounded label |
| `error-box`, `success-box`, `warning-box` | red / green / yellow message |
| `row` | text on the left, something on the right |
| `two-columns` | two boxes side by side |
| `small-button`, `outline-button`, `danger` | button styles |

Mantine is used only where it saves a lot of code: the password box with 👁, the interest **chips**, the **tag boxes** (type + Enter), the edit **pop-up**, the loading **spinner** and the corner **messages**.

---

## 7. Practice – write it yourself

Do these **from memory**, then compare with the real file and fix the differences.

**Exercise 1 – login route** (compare with `backend/routes/authRoutes.js`):
```js
router.post("/login", async (req, res) => {
  try {
    // 1. take email and password out of req.body
    // 2. not strings → 400 "Email and password are required"
    // 3. empty → 400
    // 4. find the user by email (lowercase + trim)
    // 5. no user / not active → 401 "Invalid email or password"
    // 6. bcrypt.compare typed password with the saved hash
    // 7. no match → 401
    // 8. jwt.sign({ id, role, tokenVersion }, process.env.JWT_SECRET, { expiresIn: "1d" })
    // 9. res.json({ message, token, user: { id, name, email, role } })
  } catch (error) {
    // 10. 500 "Login failed"
  }
});
```

**Exercise 2 – register route:** read → check type → check empty → check length → email taken? (409) → hash → create → 201.

**Exercise 3 – a small page** (compare with `LoginPage.jsx`):
```jsx
function LoginPage() {
  // 1. state: email, password, error
  // 2. handleLogin: preventDefault → api.post("/auth/login", ...) → saveLogin → navigate("/")
  //    catch → setError(getErrorMessage(err))
  // 3. return: <form onSubmit={handleLogin}> <label> + <input value onChange>, PasswordInput,
  //    {error && <p className="error-box">}, <button type="submit">
}
```

**Exercise 4 – a GET route:** "get my trips": `verifyToken` → `Trip.find({ members: req.user.id })` → `res.json({ trips })`.

When you can write Exercise 1 and 3 without looking, you can write any route and any page in this project.

---

## 8. Answers for the review

| Question | Answer |
|---|---|
| Problem & users | Groups waste time agreeing on trip plans in chat. TripSync AI collects everyone's preferences and the AI makes one fair plan; clashes become votes. For friends, families, colleagues. |
| Architecture | React + Vite (HTML/CSS + a few Mantine parts) → Axios → Node/Express REST API → Mongoose → MongoDB Atlas. Gemini for AI, Brevo/Gmail for email, Open-Meteo for weather. |
| Request flow | Browser → Express `/api/...` → `verifyToken` (JWT) → route checks input → Mongoose → MongoDB (or Gemini) → JSON → React re-draws. |
| Deployment | Render web service: `npm run build` builds the React app, `npm start` runs Express, which serves the API and the React build. Database: MongoDB Atlas. Every git push redeploys. |
| Production settings | Environment variables in Render (MONGO_URI, JWT_SECRET, GEMINI_API_KEY, CLIENT_URL, BREVO_API_KEY…). Locally in `.env`, which git ignores. No secrets in the code. |
| Security | bcrypt password hashing, JWT with tokenVersion (logout everywhere), type checks + sanitize middleware against NoSQL injection, CORS limited to our site, admin-only routes. |
| Technical decision | One AI service for both itinerary and group conflicts, with a JSON schema and answer checking + one retry, so broken AI answers never get saved. |
| Challenge | Render blocks normal email (SMTP), so invites never arrived → switched to the Brevo email API. (Also: invite links pointed to localhost → fixed with PUBLIC_APP_URL.) |
| Future improvements | Real hotel/transport booking, AI chat assistant, reminders when a vote is needed, edit/delete expenses, several stay options to pick from. |
