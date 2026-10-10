// Page routing: which page to show for each web address.
// Pages wrapped in <ProtectedRoute> need the user to be logged in.

import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { getCurrentUser } from "./api/axios.js";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CreateTripPage from "./pages/CreateTripPage.jsx";
import TripDetailsPage from "./pages/TripDetailsPage.jsx";
import MembersPage from "./pages/MembersPage.jsx";
import PreferencesPage from "./pages/PreferencesPage.jsx";
import ItineraryPage from "./pages/ItineraryPage.jsx";
import ConsensusPage from "./pages/ConsensusPage.jsx";
import BudgetPage from "./pages/BudgetPage.jsx";
import ReviewsPage from "./pages/ReviewsPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

// The home page: admins see the admin dashboard, travellers see their trips
function HomePage() {
  const user = getCurrentUser();

  if (user && user.role === "admin") {
    return <Navigate to="/admin" />;
  }

  return <DashboardPage />;
}

function App() {
  // The login and sign-up pages use the whole screen (no top bar)
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div>
      {!isAuthPage && <Navbar />}

      <main className={isAuthPage ? "" : "container"}>
        <Routes>
          {/* Anyone can see these */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Logged-in users only */}
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/trips/new" element={<ProtectedRoute><CreateTripPage /></ProtectedRoute>} />
          <Route path="/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* Pages of one trip. ":tripId" is replaced by the real trip id */}
          <Route path="/trips/:tripId" element={<ProtectedRoute><TripDetailsPage /></ProtectedRoute>} />
          <Route path="/trips/:tripId/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
          <Route path="/trips/:tripId/preferences" element={<ProtectedRoute><PreferencesPage /></ProtectedRoute>} />
          <Route path="/trips/:tripId/itinerary" element={<ProtectedRoute><ItineraryPage /></ProtectedRoute>} />
          <Route path="/trips/:tripId/consensus" element={<ProtectedRoute><ConsensusPage /></ProtectedRoute>} />
          <Route path="/trips/:tripId/budget" element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />

          {/* Admins only */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />

          {/* Any other address: go to the home page */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
