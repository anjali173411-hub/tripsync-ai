// Sign-up page

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react";
import AuthLayout from "../components/AuthLayout.jsx";
import api, { getErrorMessage } from "../api/axios.js";

function RegisterPage() {
  const navigate = useNavigate();

  // What the user types
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); 

  // The minimum password length comes from the backend settings
  const [minPasswordLength, setMinPasswordLength] = useState(0);

  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  
  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    const response = await api.get("/options");
    setMinPasswordLength(response.data.minPasswordLength);
  }

  // Runs when the form is submitted
  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
    
      await api.post("/auth/register", {
        name: name,
        email: email,
        password: password
      });

      // Go to the login page. The user must log in themselves.
      // "state" passes a message to the login page so it can show it.
      navigate("/login", {
        state: { message: "Account created! Please log in." }
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setLoading(false);
  }

  return (
    <AuthLayout>
      <span className="auth-tag">Join TripSync AI</span>
      <h2 className="auth-title">Create your account</h2>
      <p className="muted">Plan trips together with your friends.</p>

      <form onSubmit={handleRegister}>
        <label>Name</label>
        <div className="icon-input">
          <User size={18} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
        </div>

        <label>Email</label>
        <div className="icon-input">
          <Mail size={18} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>

        <label>Password (at least {minPasswordLength} characters)</label>
        <div className="icon-input password-field">
          <Lock size={18} />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            minLength={minPasswordLength}
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

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? "Creating account..." : "Sign up"} {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
    </AuthLayout>
  );
}

export default RegisterPage;
