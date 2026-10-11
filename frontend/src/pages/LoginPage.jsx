// Login page

import { useState } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import AuthLayout from "../components/AuthLayout.jsx";
import api, { getErrorMessage, saveLogin, getCurrentUser } from "../api/axios.js";
import Message from "../components/ui/Message.jsx";

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
    <AuthLayout>
      <span className="auth-tag">Welcome back</span>
      <h2 className="auth-title">Log in to TripSync AI</h2>
      <p className="muted">Pick up where your group left off.</p>

      <Message type="success" text={successMessage} />

      <form onSubmit={handleLogin}>
        <label>Email</label>
        <div className="icon-input">
          <Mail size={18} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>

        <label>Password</label>
        <div className="icon-input password-field">
          <Lock size={18} />
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

        <Message type="error" text={error} />

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? "Logging in..." : "Log in"} {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>
    </AuthLayout>
  );
}

export default LoginPage;
