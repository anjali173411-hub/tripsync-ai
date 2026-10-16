import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PasswordInput } from "@mantine/core";
import AuthLayout from "../components/AuthLayout.jsx";
import api, { getErrorMessage, getCurrentUser, logoutEverywhere } from "../api/axios.js";

function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggedInUser, setLoggedInUser] = useState(getCurrentUser());

  // Do not create a new account on top of someone else's login on this browser.
  if (loggedInUser) {
    return (
      <AuthLayout>
        <h2 className="auth-title">Create your account</h2>
        <p>
          This browser is logged in as <b>{loggedInUser.name}</b> ({loggedInUser.email}).
          Log out first to create a new account.
        </p>
        <div className="button-row">
          <button onClick={handleLogOut}>Log out and sign up</button>
          <button className="outline-button" onClick={() => navigate("/")}>
            Back to {loggedInUser.name}'s dashboard
          </button>
        </div>
      </AuthLayout>
    );
  }

  async function handleLogOut() {
    await logoutEverywhere();
    setLoggedInUser(null);
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError("");

    try {
      await api.post("/auth/register", { name: name, email: email, password: password });
      navigate("/login", { state: { message: "Account created! Please log in." } });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <AuthLayout>
      <h2 className="auth-title">Create your account</h2>

      <form onSubmit={handleRegister}>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Password</label>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <p className="error-box">{error}</p>}

        <button type="submit" className="full-width">Sign up</button>
      </form>

      <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
    </AuthLayout>
  );
}

export default RegisterPage;
