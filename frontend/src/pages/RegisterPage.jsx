// Sign-up page

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Eye, EyeOff } from "lucide-react";
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
    <div className="card narrow">
      <div className="auth-logo"><Leaf size={28} /></div>
      <h1>Create an account</h1>
      <p className="muted auth-subtitle">Plan trips together with friends</p>

      <form onSubmit={handleRegister}>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Password (at least {minPasswordLength} characters)</label>
        <div className="password-field">
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

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}

export default RegisterPage;
