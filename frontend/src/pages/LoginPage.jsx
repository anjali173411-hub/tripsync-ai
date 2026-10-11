// Login page

import { useState } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { PasswordInput } from "@mantine/core";
import AuthLayout from "../components/AuthLayout.jsx";
import api, { getErrorMessage, saveLogin, getCurrentUser } from "../api/axios.js";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Already logged in? Go straight to the right page.
  const loggedInUser = getCurrentUser();
  if (loggedInUser) {
    return <Navigate to={loggedInUser.role === "admin" ? "/admin" : "/"} />;
  }

  async function handleLogin(event) {
    event.preventDefault(); // stop the browser from reloading the page
    setError("");

    try {
      const response = await api.post("/auth/login", { email: email, password: password });
      saveLogin(response.data.token, response.data.user);
      navigate(response.data.user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <AuthLayout>
      <h2 className="auth-title">Log in to TripSync AI</h2>

      {/* After signing up, the Register page sends "Account created! Please log in." */}
      {location.state && location.state.message && <p className="success-box">{location.state.message}</p>}

      <form onSubmit={handleLogin}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Password</label>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <p className="error-box">{error}</p>}

        <button type="submit" className="full-width">Log in</button>
      </form>

      <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>
    </AuthLayout>
  );
}

export default LoginPage;
