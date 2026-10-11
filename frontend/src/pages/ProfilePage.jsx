

import { useEffect, useState } from "react";
import { Card, Title, Text, TextInput, Chip, SegmentedControl, Button, Avatar, Group, Stack, Divider, Alert } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Save, User } from "lucide-react";
import api, { getErrorMessage, getCurrentUser, saveLogin } from "../api/axios.js";

function ProfilePage() {
  // Choices that come from the backend
  const [interestOptions, setInterestOptions] = useState([]);
  const [paceOptions, setPaceOptions] = useState([]);

  // What the user fills in
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState([]);
  const [pace, setPace] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Runs once when the page opens
  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const optionsResponse = await api.get("/options");
      setInterestOptions(optionsResponse.data.interestOptions);
      setPaceOptions(optionsResponse.data.paceOptions);

      const profileResponse = await api.get("/profile");
      const user = profileResponse.data.user;
      setName(user.name);
      setEmail(user.email);
      setInterests(user.defaultPreferences.interests);
      setPace(user.defaultPreferences.pace);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const response = await api.put("/profile", {
        name: name,
        defaultInterests: interests,
        defaultPace: pace
      });

      // Keep the new name in the top bar too
      const savedUser = getCurrentUser();
      savedUser.name = response.data.user.name;
      saveLogin(localStorage.getItem("token"), savedUser);

      notifications.show({ message: "Profile saved ✓", color: "green" });
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setSaving(false);
  }

  return (
    <Card maw={680} mx="auto" p="xl">
      <form onSubmit={handleSave}>
        <Stack gap="lg">
          {/* Who I am */}
          <Group>
            <Avatar size={64} radius="xl" color="maroon" variant="filled">
              {name ? name.charAt(0).toUpperCase() : <User size={28} />}
            </Avatar>
            <div>
              <Title order={1}>My Profile</Title>
              <Text c="dimmed">{email}</Text>
            </div>
          </Group>

          <TextInput label="Name" value={name} onChange={(e) => setName(e.target.value)} required />

          <Divider />

          <div>
            <Title order={3}>My usual travel style</Title>
            <Text c="dimmed" size="sm">
              These fill in your preferences automatically whenever you join a new trip.
              You can still change them for each trip.
            </Text>
          </div>

          <div>
            <Text fw={600} size="sm" mb={8}>Interests</Text>
            {/* "multiple" lets you pick many chips; Mantine keeps the list in "interests" */}
            <Chip.Group multiple value={interests} onChange={setInterests}>
              <Group gap="xs">
                {interestOptions.map((interest) => (
                  <Chip key={interest} value={interest} className="capitalize">{interest}</Chip>
                ))}
              </Group>
            </Chip.Group>
          </div>

          <div>
            <Text fw={600} size="sm" mb={8}>Pace</Text>
            <SegmentedControl fullWidth data={paceOptions} value={pace} onChange={setPace} className="capitalize" />
          </div>

          {error && <Alert color="red" variant="light">{error}</Alert>}

          <Group justify="flex-end">
            <Button type="submit" size="md" loading={saving} leftSection={<Save size={16} />}>Save profile</Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}

export default ProfilePage;
