# TripSync AI – Frontend cheat sheet

**Tech:** React 19 + Vite · React Router 7 · Axios · plain HTML + CSS (index.css) · a few Mantine parts · lucide-react (icons)

---

## 1. Files and what they do

| File | Job |
|---|---|
| `main.jsx` | Starts the app. Wraps it in **MantineProvider** (colour for the Mantine parts), **Notifications** (corner messages) and **BrowserRouter** (pages). |
| `theme.js` | The green colour and font for the few Mantine parts we use. |
| `App.jsx` | The list of pages: which web address shows which page. Hides the top bar on login/sign up. |
| `index.css` | Our own styles: banners, trip cards, login split-screen, sidebar, top bar. |
| `api/axios.js` | Talks to the backend + small helpers (`formatMoney`, `formatDate`, `getCurrentUser` …). |
| `components/Navbar.jsx` | Top bar: logo, menu, logout button. |
| `components/Sidebar.jsx` | Left menu inside a trip (Details, Members, Preferences, Itinerary, Decisions, Budget). |
| `components/ProtectedRoute.jsx` | Guard: not logged in → login page. `adminOnly` → only admins. |
| `components/AuthLayout.jsx` | Split screen for login / sign up (green story left, form right). |
| `pages/*.jsx` | One file per screen (12 pages). |

---

## 2. The pattern every page follows

```jsx
function SomePage() {
  // ① STATE – what the page remembers (one useState per thing)
  const [trip, setTrip] = useState(null);

  // ② LOAD – runs once when the page opens
  useEffect(() => { loadPage(); }, [tripId]);
  async function loadPage() {
    const response = await api.get("/trips/" + tripId);
    setTrip(response.data.trip);          // changing state re-draws the screen
  }

  async function handleSave(event) {
    event.preventDefault();               // stop the browser reloading the page
    await api.put("/trips/" + tripId + "/preferences", { ... });
    notifications.show({ message: "Saved ✓" });
  }

  // ④ SHOW – the screen, built from Mantine components
  return <Card> ... <Button onClick={handleSave}>Save</Button> </Card>;
}
```

**One sentence for the viva:** *"Each page stores its data in state with useState; useEffect calls loadPage when the page opens, which uses Axios to get data from our Express API; user actions call handle… functions that send requests; and the screen is built with Mantine components."*

---

## 3. How login works (very common question)

1. **LoginPage** sends email + password → `POST /api/auth/login`.
2. Backend replies with a **JWT token** + user details.
3. `saveLogin()` stores both in the browser's **localStorage**.
4. `api/axios.js` has an **interceptor** that adds `Authorization: Bearer <token>` to **every** request automatically.
5. If the backend ever answers **401** (token expired / logged out elsewhere), the other interceptor logs the user out and sends them to the login page.
6. **ProtectedRoute** checks `getCurrentUser()` – no user → `/login`; `adminOnly` page and not admin → `/`.
7. **Logout** calls `POST /api/auth/logout` (backend increases `tokenVersion`, so old tokens stop working everywhere) and clears localStorage.

---

## 4. Pages (address → page → what it does)

| Address | Page | Main Mantine parts |
|---|---|---|
| `/login`, `/register` | Login / Register | label + input, PasswordInput (built-in 👁) |
| `/` | Dashboard | banner, invitations with Accept/Decline, trip photo cards |
| `/trips/new` | Create Trip | inputs, `<select>` for type and travel mode, `<input type="date">` (no past dates) |
| `/trips/:tripId` | Trip Details | photo banner, detail boxes, weather per day, archive/delete/complete |
| `.../members` | Members | member list, invite by email or search, remove |
| `.../preferences` | My Preferences | interest **chips**, `<select>` for pace/food/stay, **tag boxes** (must-do, avoid), "Describe your trip" → AI fills the form |
| `.../itinerary` | Itinerary | cost box, stay box, day buttons, activity list with Edit / Earlier / Later / Remove, edit pop-up, change plan with AI, finalise |
| `.../consensus` | Group Decisions | each decision with its options, vote counts, Vote / Decide for everyone |
| `.../budget` | Budget | spent bar, add expense form, by category, who paid what table, all expenses |
| `/profile` | Profile | name, interest chips, pace `<select>` |
| `/admin` | Admin | number boxes, popular destinations, users table with Activate/Deactivate |

`:tripId` is read with **`useParams()`**. Going to another page in code uses **`useNavigate()`**.

---

## 5. Quick answers

| Question | Answer |
|---|---|
| **useState** | Stores data the page remembers; calling `setX` updates it and re-draws the screen. |
| **useEffect** | Runs code after the page shows – we use it to load data when the page opens. The `[tripId]` list means "run again if tripId changes". |
| **Props** | Values passed into a component, e.g. `<Sidebar trip={trip} />` → inside: `props.trip`. |
| **`.map()` in JSX** | Draws one item per list entry: `trips.map((trip) => drawTripCard(trip))`. Each needs a unique `key`. |
| **`&&` in JSX** | Show only if true: `{error && <Alert>{error}</Alert>}`. |
| **Controlled input** | `value={name}` + `onChange={(e) => setName(e.target.value)}` – React state always holds what's typed. |
| **Why so little Mantine?** | Plain HTML + CSS is easier to read and explain; Mantine is used only where it saves a lot of code (password 👁, chips, tag boxes, pop-up, spinner, messages). |
| **"Are you sure?"** | `if (!window.confirm("Delete this trip?")) { return; }` – the browser's OK / Cancel box. |
| **"Saved ✓" messages** | `notifications.show({ message: "Saved ✓" })` from Mantine – a small pop-up in the corner. |
| **Why Axios?** | Simple requests, and interceptors add the token / handle 401 in one place. |
| **Where's the AI?** | Not in the frontend. The frontend only calls the backend (e.g. `POST /trips/:id/generate`); the backend calls Gemini. |
| **Environment** | `VITE_API_URL` tells the frontend where the backend is (`.env` locally, `/api` online). |

---

