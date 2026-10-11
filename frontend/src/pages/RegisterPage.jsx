// Sign-up page

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PasswordInput } from "@mantine/core";
import AuthLayout from "../components/AuthLayout.jsx";
import api, { getErrorMessage } from "../api/axios.js";

function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [minPasswordLength, setMinPasswordLength] = useState(0); // from the backend settings
  const [error, setError] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    const response = await api.get("/options");
    setMinPasswordLength(response.data.minPasswordLength);
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError("");

    try {
      await api.post("/auth/register", { name: name, email: email, password: password });
      // The user logs in themselves; this message is shown on the login page
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

        <label>Email (use the one your friends invited)</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Password (at least {minPasswordLength} characters, one capital letter and one special character like @ or #)</label>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} minLength={minPasswordLength} required />

        {error && <p className="error-box">{error}</p>}

        <button type="submit" className="full-width">Sign up</button>
      </form>

      <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
    </AuthLayout>
  );
}

export default RegisterPage;
