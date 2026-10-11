// Create a new solo or group trip (FR-2.1, FR-2.2)
// Built with Mantine components (Card, TextInput, SegmentedControl, DatePickerInput ...).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Title, Text, TextInput, NumberInput, SegmentedControl, Button, Alert, Group, SimpleGrid, Stack } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { MapPin, Navigation, CalendarDays, Wallet, Sparkles, User, Users } from "lucide-react";
import dayjs from "dayjs";
import api, { getErrorMessage, travelModeText } from "../api/axios.js";

function CreateTripPage() {
  const navigate = useNavigate();

  // Choices that come from the backend
  const [tripTypes, setTripTypes] = useState([]);
  const [travelModes, setTravelModes] = useState([]);
  const [currency, setCurrency] = useState("");

  // What the user types
  const [title, setTitle] = useState("");
  const [startingFrom, setStartingFrom] = useState("");
  const [destination, setDestination] = useState("");
  const [type, setType] = useState("");
  const [travelMode, setTravelMode] = useState("");
  const [startDate, setStartDate] = useState(null); // "2026-11-12" once picked
  const [endDate, setEndDate] = useState(null);
  const [budget, setBudget] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Today, so the calendar can't pick a date in the past
  const today = dayjs().format("YYYY-MM-DD");

  // Runs once when the page opens
  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    const response = await api.get("/options");
    setTripTypes(response.data.tripTypes);
    setTravelModes(response.data.travelModes);
    setCurrency(response.data.currency);
    setType(response.data.tripTypes[0]); // pick the first type by default
  }

  // When the start date changes, clear an end date that is now before it
  function handleStartDate(value) {
    setStartDate(value);
    if (endDate && value && endDate < value) {
      setEndDate(null);
    }
  }

  // Runs when the form is submitted
  async function handleCreate(event) {
    event.preventDefault();
    setError("");

    if (!travelMode) {
      setError("Please choose how you are travelling");
      return;
    }
    if (!startDate || !endDate) {
      setError("Please pick the start and end dates");
      return;
    }

    setSaving(true);

    try {
      const response = await api.post("/trips", {
        title: title,
        startingFrom: startingFrom,
        destination: destination,
        type: type,
        travelMode: travelMode,
        startDate: startDate,
        endDate: endDate,
        budget: Number(budget)
      });

      // A small pop-up in the corner
      notifications.show({
        title: "Trip created 🎉",
        message: "Now invite people and fill in your preferences.",
        color: "green"
      });

      // Open the new trip
      navigate("/trips/" + response.data.trip._id);
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setSaving(false);
  }

  // The choices for the two switches: [{ value: "solo", label: "Just me" }, ...]
  const typeChoices = [];
  for (let i = 0; i < tripTypes.length; i++) {
    const label = tripTypes[i] === "solo" ? "🧍 Just me" : "👥 With friends";
    typeChoices.push({ value: tripTypes[i], label: label });
  }

  const modeChoices = [];
  for (let i = 0; i < travelModes.length; i++) {
    modeChoices.push({ value: travelModes[i], label: travelModeText(travelModes[i]) });
  }

  return (
    <Card maw={680} mx="auto" p="xl">
      <form onSubmit={handleCreate}>
        <Stack gap="lg">
          <div>
            <Text c="maroon.7" fw={800} size="xs" tt="uppercase">
              <Sparkles size={13} /> New trip
            </Text>
            <Title order={1}>Where are you going?</Title>
            <Text c="dimmed">Fill this in once. The AI uses it to plan your days.</Text>
          </div>

          <TextInput
            label="Trip name"
            placeholder="Goa with college friends"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="From"
              placeholder="Chennai"
              leftSection={<Navigation size={16} />}
              value={startingFrom}
              onChange={(e) => setStartingFrom(e.target.value)}
              required
            />
            <TextInput
              label="To"
              placeholder="Goa"
              leftSection={<MapPin size={16} />}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </SimpleGrid>

          <div>
            <Text fw={600} size="sm" mb={6}>Who is going?</Text>
            <SegmentedControl fullWidth size="md" data={typeChoices} value={type} onChange={setType} />
            <Text c="dimmed" size="xs" mt={6}>
              {type === "group" ? <Users size={12} /> : <User size={12} />} You can invite people to a group trip after creating it.
            </Text>
          </div>

          <div>
            <Text fw={600} size="sm" mb={6}>How are you travelling?</Text>
            <SegmentedControl fullWidth size="md" data={modeChoices} value={travelMode} onChange={setTravelMode} />
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <DatePickerInput
              label="Start date"
              placeholder="Pick a date"
              leftSection={<CalendarDays size={16} />}
              minDate={today}
              value={startDate}
              onChange={handleStartDate}
              required
            />
            <DatePickerInput
              label="End date"
              placeholder="Pick a date"
              leftSection={<CalendarDays size={16} />}
              minDate={startDate || today}
              value={endDate}
              onChange={setEndDate}
              required
            />
          </SimpleGrid>

          <NumberInput
            label={"Total budget (" + currency + ")"}
            description="For a group trip, this is for everyone together, not per person."
            placeholder="50,000"
            leftSection={<Wallet size={16} />}
            min={0}
            thousandSeparator=","
            value={budget}
            onChange={setBudget}
            required
          />

          {error && <Alert color="red" variant="light">{error}</Alert>}

          <Group justify="flex-end">
            <Button variant="default" onClick={() => navigate("/")}>Cancel</Button>
            <Button type="submit" size="md" loading={saving}>Create trip</Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}

export default CreateTripPage;
