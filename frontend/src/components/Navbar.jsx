import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Leaf, LogOut } from "lucide-react";
import { getCurrentUser, logoutEverywhere } from "../api/axios.js";

function Navbar() {
  useLocation();

  const navigate = useNavigate();
  const user = getCurrentUser();

  async function handleLogout() {
    await logoutEverywhere();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <span className="brand-icon"><Leaf size={22} /></span>
        <span>
          <span className="brand-name">TripSync AI</span>
          <span className="brand-tagline">Plan your perfect trip together</span>
        </span>
      </Link>

      {user && (
        <div className="nav-links">
          {user.role === "admin" && <NavLink to="/admin">Admin Dashboard</NavLink>}

          {user.role !== "admin" && <NavLink to="/" end>My Trips</NavLink>}
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
