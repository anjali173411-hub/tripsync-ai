// Login page

import { useState } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Leaf, Eye, EyeOff } from "lucide-react";
import api, { getErrorMessage, saveLogin, getCurrentUser } from "../api/axios.js";

function LoginPage() {
  const navigate = useNavigate();

  // If we came here from the sign-up page, it sends a message like "Account created!"
  const location = useLocation();
  let successMessage = "";
  if (location.state && location.state.message) {
    successMessage = location.state.message;
  }

  // What the user types
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // true = show the password as normal text

  // Messages on screen
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  
  // Already logged in? Admins go to the admin dashboard, everyone else to their trips
  const loggedInUser = getCurrentUser();
  if (loggedInUser) {
    if (loggedInUser.role === "admin") {
      return <Navigate to="/admin" />;
    }
    return <Navigate to="/" />;
  }

  // Runs when the form is submitted
  async function handleLogin(event) {
    event.preventDefault(); // stop the browser from reloading the page
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email,
        password: password
      });

      saveLogin(response.data.token, response.data.user);

      // Admins go to the admin dashboard, everyone else to their trips
      if (response.data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setLoading(false);
  }

  return (
    <div className="card narrow">
      <div className="auth-logo"><Leaf size={28} /></div>
      <h1>Welcome back</h1>
      <p className="muted auth-subtitle">Log in to plan your next trip</p>

      {successMessage && <p className="success">{successMessage}</p>}

      <form onSubmit={handleLogin}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Password</label>
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {/* Eye button: shows or hides the password */}
          <button
            type="button"
            className="eye-button"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p>New here? <Link to="/register">Create an account</Link></p>
    </div>
  );
}

export default LoginPage;
