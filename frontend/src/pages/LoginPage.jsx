import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { PasswordInput } from "@mantine/core";
import AuthLayout from "../components/AuthLayout.jsx";
import api, { getErrorMessage, saveLogin, getCurrentUser, logoutEverywhere } from "../api/axios.js";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [loggedInUser, setLoggedInUser] = useState(getCurrentUser());

  // Someone else may still be logged in on this browser (for example the organiser,
  // when an invited friend opens the email link on the same computer).
  // Ask instead of silently opening their account.
  if (loggedInUser) {
    return (
      <AuthLayout>
        <h2 className="auth-title">You are already logged in</h2>
        <p>
          This browser is logged in as <b>{loggedInUser.name}</b> ({loggedInUser.email}).
        </p>
        <div className="button-row">
          <button onClick={() => navigate(loggedInUser.role === "admin" ? "/admin" : "/")}>
            Continue as {loggedInUser.name}
          </button>
          <button className="outline-button" onClick={handleSwitchAccount}>
            Log in as someone else
          </button>
        </div>
      </AuthLayout>
    );
  }

  async function handleSwitchAccount() {
    await logoutEverywhere();
    setLoggedInUser(null);
  }

  async function handleLogin(event) {
    event.preventDefault();
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
