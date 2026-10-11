// Login page
// Built with Mantine components (TextInput, PasswordInput, Button, Alert).

import { useState } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Title, Text, TextInput, PasswordInput, Button, Alert, Anchor, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Mail, Lock, ArrowRight } from "lucide-react";
import AuthLayout from "../components/AuthLayout.jsx";
import api, { getErrorMessage, saveLogin, getCurrentUser } from "../api/axios.js";

function LoginPage() {
  const navigate = useNavigate();

  const location = useLocation();
  let successMessage = "";
  if (location.state && location.state.message) {
    successMessage = location.state.message;
  }

  // What the user types
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Messages on screen
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in? Go straight to the right page.
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

      notifications.show({ message: "Welcome back, " + response.data.user.name + " 👋", color: "green" });

      // Admins go to the admin dashboard, everyone else to their trips
      if (response.data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <span className="auth-tag">Welcome back</span>
      <Title order={2} className="auth-title">Log in to TripSync AI</Title>
      <Text c="dimmed" mb="lg">Pick up where your group left off.</Text>

      {successMessage && <Alert color="green" variant="light" mb="md">{successMessage}</Alert>}

      <form onSubmit={handleLogin}>
        <Stack gap="md">
          <TextInput
            label="Email"
            type="email"
            placeholder="you@example.com"
            leftSection={<Mail size={18} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <PasswordInput
            label="Password"
            placeholder="Your password"
            leftSection={<Lock size={18} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <Alert color="red" variant="light">{error}</Alert>}

          <Button type="submit" size="lg" fullWidth loading={loading} rightSection={<ArrowRight size={18} />}>
            Log in
          </Button>
        </Stack>
      </form>

      <Text ta="center" mt="lg" c="dimmed">
        New here? <Anchor component={Link} to="/register" fw={700}>Create an account</Anchor>
      </Text>
    </AuthLayout>
  );
}

export default LoginPage;
