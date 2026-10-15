# TripSync AI – Frontend

The frontend is a React app built with Vite. It shows the screens and talks to the backend through Axios.

## Tech used

| Tool | Used for |
|---|---|
| React 19 | Building the pages |
| Vite | Running and building the app |
| React Router 7 | Moving between pages |
| Axios | Sending requests to the backend |
| index.css | All the styling (plain CSS) |
| Mantine | Password box, chips, tag boxes, pop-up, loading spinner, notifications |
| lucide-react | Icons |

## Folder structure

```
frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── theme.js
    ├── index.css
    ├── api/
    │   └── axios.js
    ├── components/
    │   ├── Navbar.jsx
    │   ├── Sidebar.jsx
    │   ├── ProtectedRoute.jsx
    │   └── AuthLayout.jsx
    └── pages/
        ├── LoginPage.jsx
        ├── RegisterPage.jsx
        ├── DashboardPage.jsx
        ├── CreateTripPage.jsx
        ├── TripDetailsPage.jsx
        ├── MembersPage.jsx
        ├── PreferencesPage.jsx
        ├── ItineraryPage.jsx
        ├── ConsensusPage.jsx
        ├── BudgetPage.jsx
        ├── ProfilePage.jsx
        └── AdminPage.jsx
```

## Main files

| File | What it does |
|---|---|
| `main.jsx` | Starts the app and wraps it in MantineProvider, Notifications and BrowserRouter |
| `App.jsx` | Lists all the pages and their web addresses. Hides the top bar on login and register. Sends admins to `/admin` |
| `theme.js` | Green colour and font for the Mantine parts |
| `index.css` | Styles for boxes, buttons, tables, bars, cards, sidebar and top bar |
| `api/axios.js` | Backend connection. Adds the login token to every request and logs the user out if the token has expired. Also has helpers: `getErrorMessage`, `saveLogin`, `getCurrentUser`, `logout`, `formatDate`, `formatDateRange`, `formatMoney` |

## Components

| Component | What it does |
|---|---|
| `Navbar` | Top bar with logo, menu and logout |
| `Sidebar` | Left menu inside a trip: Details, Members, Preferences, Itinerary, Decisions, Budget |
| `ProtectedRoute` | Sends users who are not logged in to the login page. With `adminOnly`, only admins can open the page |
| `AuthLayout` | Split screen used by the login and register pages |

## Pages

| Address | Page | What it shows | Backend calls |
|---|---|---|---|
| `/login` | Login | Email and password form | `POST /auth/login` |
| `/register` | Register | Name, email and password form | `POST /auth/register` |
| `/` | Dashboard | Invitations with Accept / Decline, and trip cards | `GET /trips`, `GET /trips/invitations/mine` |
| `/trips/new` | Create Trip | Trip name, solo or group, destination, dates, travel mode, budget | `POST /trips` |
| `/trips/:tripId` | Trip Details | Trip banner, details, weather, complete / archive / delete | `GET /trips/:id`, `GET /trips/:id/weather` |
| `/trips/:tripId/members` | Members | Member list, invite by email, remove a member | invite, cancel invite, remove, `GET /profile/search` |
| `/trips/:tripId/preferences` | Preferences | Interests, pace, food, stay, must-do, avoid. "Fill with AI" fills the form from a short description | `GET /preferences/me`, `PUT /preferences`, `POST /preferences/from-text` |
| `/trips/:tripId/itinerary` | Itinerary | Total cost, stay suggestion, day tabs, activities with edit / move / remove icons, AI re-plan, finalise | `POST /generate`, `GET /itinerary`, edit, move, remove, re-plan, finalise |
| `/trips/:tripId/consensus` | Group Decisions | Conflicts with options, vote counts, vote button, organiser decides | vote, decide |
| `/trips/:tripId/budget` | Budget | Spent bar, add expense, totals by category, who paid what, all expenses, AI money-saving tips | `GET /budget`, `POST /expenses`, `POST /budget/suggestions` |
| `/profile` | Profile | Name, default interests and pace | `GET /profile`, `PUT /profile` |
| `/admin` | Admin (admins only) | Platform numbers, popular destinations, users table with Activate / Deactivate | `GET /admin/summary`, `GET /admin/users`, `PATCH /admin/users/:id/status` |



## Running the frontend

```
cd frontend
npm install
npm run dev
```

`frontend/.env` holds `VITE_API_URL=http://localhost:5000/api`. On the live site this is not set, so the app uses `/api` on the same server.
