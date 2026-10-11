// Sign-up page
// Built with Mantine components (TextInput, PasswordInput, Button, Alert).

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Title, Text, TextInput, PasswordInput, Button, Alert, Anchor, Stack } from "@mantine/core";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import AuthLayout from "../components/AuthLayout.jsx";
import api, { getErrorMessage } from "../api/axios.js";

function RegisterPage() {
  const navigate = useNavigate();

  // What the user types
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // The minimum password length comes from the backend settings
  const [minPasswordLength, setMinPasswordLength] = useState(0);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Runs once when the page opens
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
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <span className="auth-tag">Join TripSync AI</span>
      <Title order={2} className="auth-title">Create your account</Title>
      <Text c="dimmed" mb="lg">Plan trips together with your friends.</Text>

      <form onSubmit={handleRegister}>
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="Your name"
            leftSection={<User size={18} />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <TextInput
            label="Email"
            type="email"
            placeholder="you@example.com"
            description="Use the email your friends invited, so their invites show up."
            leftSection={<Mail size={18} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* PasswordInput has the eye button built in */}
          <PasswordInput
            label="Password"
            description={"At least " + minPasswordLength + " characters"}
            leftSection={<Lock size={18} />}
            minLength={minPasswordLength}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <Alert color="red" variant="light">{error}</Alert>}

          <Button type="submit" size="lg" fullWidth loading={loading} rightSection={<ArrowRight size={18} />}>
            Sign up
          </Button>
        </Stack>
      </form>

      <Text ta="center" mt="lg" c="dimmed">
        Already have an account? <Anchor component={Link} to="/login" fw={700}>Log in</Anchor>
      </Text>
    </AuthLayout>
  );
}

export default RegisterPage;
