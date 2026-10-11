# TripSync AI – Frontend cheat sheet

**Tech:** React 19 + Vite · React Router 7 · Axios · Mantine 9 (UI components) · lucide-react (icons) · one CSS file

---

## 1. Files and what they do

| File | Job |
|---|---|
| `main.jsx` | Starts the app. Wraps it in **MantineProvider** (theme), **Notifications** (pop-up messages), **ModalsProvider** ("Are you sure?" pop-ups) and **BrowserRouter** (pages). |
| `theme.js` | The maroon colour, font and rounded corners for **all** Mantine components – set once. |
| `App.jsx` | The list of pages: which web address shows which page. Hides the top bar on login/sign up. |
| `index.css` | Our own styles: banners, trip cards, login split-screen, sidebar, top bar. |
| `api/axios.js` | Talks to the backend + small helpers (`formatMoney`, `formatDate`, `getCurrentUser` …). |
| `components/Navbar.jsx` | Top bar: logo, menu, logout button. |
| `components/Sidebar.jsx` | Left menu inside a trip (Details, Members, Preferences, Itinerary, Decisions, Budget). |
| `components/ProtectedRoute.jsx` | Guard: not logged in → login page. `adminOnly` → only admins. |
| `components/AuthLayout.jsx` | Split screen for login / sign up (maroon story left, form right). |
| `pages/*.jsx` | One file per screen (13 pages). |

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
| `/login`, `/register` | Login / Register | TextInput, PasswordInput (built-in 👁), Button `loading` |
| `/` | Dashboard | Paper banner, number tiles, invitation cards, trip photo cards |
| `/trips/new` | Create Trip | SegmentedControl (solo/group, train/bus/car), DatePickerInput (no past dates), NumberInput |
| `/trips/:tripId` | Trip Details | Photo banner, info tiles, weather cards, Archive/Delete with confirm |
| `.../members` | Members | Avatar, Badge, invite by email or search |
| `.../preferences` | My Preferences | **Chip.Group** (interests), SegmentedControl (pace), **TagsInput** (must-do, deal-breakers), "Describe your trip" → AI fills form |
| `.../itinerary` | Itinerary | **Tabs** (days), **Timeline** (activities), **Menu** ⋮ (edit/move/remove), **Modal** (edit), Progress (budget), Accordion (change plan with AI) |
| `.../consensus` | Group Decisions | Badge status, Avatar options A/B/C, Progress vote bar, vote buttons |
| `.../budget` | Budget | **RingProgress** (% used), Table (who paid what), Select, NumberInput |
| `/reviews` | Reviews / Destinations | Card + Image, **Rating** stars, Modal for reviews and admin form |
| `/profile` | Profile | Avatar, Chip.Group, SegmentedControl |
| `/admin` | Admin | Number tiles, Progress bars, users Table with Activate/Deactivate |

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
| **Why Mantine?** | Ready-made, good-looking, accessible components; one theme for the whole app; less CSS to write. |
| **"Are you sure?" pop-up** | `modals.openConfirmModal({ title, children, labels, onConfirm })` from Mantine. The action (e.g. delete) runs only in `onConfirm`, when the user clicks the button. |
| **"Saved ✓" messages** | `notifications.show({ message: "Saved ✓" })` from Mantine – a small pop-up in the corner. |
| **Why Axios?** | Simple requests, and interceptors add the token / handle 401 in one place. |
| **Where's the AI?** | Not in the frontend. The frontend only calls the backend (e.g. `POST /trips/:id/generate`); the backend calls Gemini. |
| **Environment** | `VITE_API_URL` tells the frontend where the backend is (`.env` locally, `/api` online). |

---

## 6. Study order (easiest → hardest)

1. `LoginPage.jsx` – simplest example of the pattern
2. `RegisterPage.jsx`
3. `App.jsx` + `ProtectedRoute.jsx` + `api/axios.js` – routing and login
4. `CreateTripPage.jsx` – a form
5. `DashboardPage.jsx` – lists with `.map()`
6. `MembersPage.jsx`, `PreferencesPage.jsx`
7. `BudgetPage.jsx`, `ConsensusPage.jsx`
8. `ItineraryPage.jsx` – read in parts: load → AI buttons → cost maths → timeline
