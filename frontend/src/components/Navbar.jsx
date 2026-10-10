// The bar at the top of every page: logo on the left, menu on the right.

import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Leaf, LogOut } from "lucide-react";
import { getCurrentUser, logoutEverywhere } from "../api/axios.js";

function Navbar() {
  // useLocation() makes this navbar redraw every time the page changes,
  // so it notices when someone logs in or out.
  useLocation();

  const navigate = useNavigate();
  const user = getCurrentUser();

  async function handleLogout() {
    await logoutEverywhere();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      {/* Logo: square with a leaf, then the name and tagline */}
      <Link to="/" className="brand">
        <span className="brand-icon"><Leaf size={22} /></span>
        <span>
          <span className="brand-name">TripSync AI</span>
          <span className="brand-tagline">Plan your perfect trip together</span>
        </span>
      </Link>

      {/* Menu: only shown when someone is logged in */}
      {user && (
        <div className="nav-links">
          {/* Admin menu */}
          {user.role === "admin" && <NavLink to="/admin">Admin Dashboard</NavLink>}
          {user.role === "admin" && <NavLink to="/reviews">Destinations</NavLink>}

          {/* Traveller menu */}
          {user.role !== "admin" && <NavLink to="/" end>My Trips</NavLink>}
          {user.role !== "admin" && <NavLink to="/reviews">Reviews</NavLink>}
          <NavLink to="/profile">Profile</NavLink>

          <span className="nav-user">
            {user.name}
            {user.role === "admin" && <span className="admin-badge">Admin</span>}
          </span>

          <button className="icon-button" onClick={handleLogout} title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
