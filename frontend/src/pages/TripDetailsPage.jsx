

import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Paper, Card, Title, Text, Badge, Button, Group, SimpleGrid, ThemeIcon, Alert, Anchor, Center, Loader } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { Navigation, TrainFront, CalendarDays, Wallet, Users, Crown, Archive, Trash2, Flag } from "lucide-react";
import api, { getErrorMessage, getCurrentUser, formatDate, formatMoney, travelModeText } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";

function TripDetailsPage() {
  const { tripId } = useParams(); 
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [trip, setTrip] = useState(null);
  const [currency, setCurrency] = useState("");
  const [weather, setWeather] = useState(null);     
  const [weatherMessage, setWeatherMessage] = useState("Loading weather...");
  const [error, setError] = useState("");
  useEffect(() => {
    loadPage();
  }, [tripId]);

  async function loadPage() {
    try {
      const tripResponse = await api.get("/trips/" + tripId);
      setTrip(tripResponse.data.trip);

      const optionsResponse = await api.get("/options");
      setCurrency(optionsResponse.data.currency);
    } catch (err) {
      setError(getErrorMessage(err));
    }

    loadWeather();
  }

  async function loadWeather() {
    try {
      const response = await api.get("/trips/" + tripId + "/weather");
      setWeather(response.data);
    } catch (err) {
      setWeatherMessage(getErrorMessage(err));
    }
  }

  function getWeatherTitle() {
    if (weather.type === "forecast") {
      return "Weather forecast";
    }
    if (weather.type === "past") {
      return "Weather on your trip";
    }
    return "Typical weather for these dates";
  }

  function handleArchive() {
    modals.openConfirmModal({
      title: "Archive this trip?",
      centered: true,
      children: <Text size="sm">It will move to 'Archived trips' on your dashboard. Nothing is deleted.</Text>,
      labels: { confirm: "Archive", cancel: "Cancel" },
      confirmProps: { color: "maroon" },
      onConfirm: archiveTrip
    });
  }

  async function archiveTrip() {
    try {
      await api.patch("/trips/" + tripId + "/archive");
      notifications.show({ message: "Trip archived" });
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }
  function handleDelete() {
    modals.openConfirmModal({
      title: "Delete this trip for everyone?",
      centered: true,
      children: <Text size="sm">The itinerary, votes, expenses and preferences will be deleted. This cannot be undone.</Text>,
      labels: { confirm: "Delete trip", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: deleteTrip
    });
  }

  async function deleteTrip() {
    try {
      await api.delete("/trips/" + tripId);
      notifications.show({ message: "Trip deleted", color: "red" });
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handleComplete() {
    modals.openConfirmModal({
      title: "Mark this trip as completed?",
      centered: true,
      children: <Text size="sm">Members can then write reviews of the destination.</Text>,
      labels: { confirm: "Yes, completed", cancel: "Cancel" },
      confirmProps: { color: "maroon" },
      onConfirm: completeTrip
    });
  }

  async function completeTrip() {
    try {
      await api.patch("/trips/" + tripId + "/complete");
      notifications.show({ title: "Welcome back!", message: "You can now write a review.", color: "green" });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function getTypeText() {
    if (trip.type === "solo") {
      return "Solo trip";
    }
    if (trip.members.length === 1) {
      return "Group trip · 1 member";
    }
    return "Group trip · " + trip.members.length + " members";
  }

  if (!trip) {
    if (error) {
      return <Alert color="red" variant="light">{error}</Alert>;
    }
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  const isOrganiser = trip.organiser._id === user.id;

  const tiles = [
    { icon: <Navigation size={18} />, label: "Route", value: (trip.startingFrom ? trip.startingFrom + " → " : "") + trip.destination },
    { icon: <TrainFront size={18} />, label: "Travelling by", value: travelModeText(trip.travelMode) },
    { icon: <CalendarDays size={18} />, label: "Dates", value: formatDate(trip.startDate) + " – " + formatDate(trip.endDate) },
    { icon: <Wallet size={18} />, label: "Total budget (everyone)", value: formatMoney(trip.budget, currency) },
    { icon: <Users size={18} />, label: "Type", value: getTypeText() },
    { icon: <Crown size={18} />, label: "Organiser", value: trip.organiser.name }
  ];

  let bannerStyle = {};
  if (trip.destinationImage) {
    bannerStyle = { backgroundImage: "url(" + trip.destinationImage + ")" };
  }

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        {/* Photo banner with the trip name */}
        <Paper className="trip-banner" radius="lg" mb="lg" style={bannerStyle}>
          <div className="trip-banner-text">
            <Badge color="yellow.4" c="dark.8" size="lg" mb="xs">{trip.status}</Badge>
            <Title order={1} c="white">{trip.title}</Title>
            <Text c="white" opacity={0.85}>
              {trip.startingFrom ? trip.startingFrom + " → " : ""}{trip.destination}
            </Text>
          </div>
        </Paper>

        {error && <Alert color="red" variant="light" mb="md">{error}</Alert>}

        {/* Trip details as tiles */}
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} mb="lg">
          {tiles.map((tile) => (
            <Paper key={tile.label} withBorder radius="lg" p="md">
              <Group wrap="nowrap">
                <ThemeIcon size={40} radius="md" variant="light">{tile.icon}</ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{tile.label}</Text>
                  <Text fw={700}>{tile.value}</Text>
                </div>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>

        {/* Weather for each day of the trip */}
        <Card mb="lg">
          {!weather && (
            <div>
              <Title order={3}>Weather</Title>
              <Text c="dimmed">{weatherMessage}</Text>
            </div>
          )}

          {weather && (
            <div>
              <Title order={3}>{getWeatherTitle()}</Title>
              <Text c="dimmed" size="sm" mb="md">
                {weather.place}
                {weather.type === "typical" &&
                  " · Your trip is too far away for a real forecast, so this shows the weather on the same dates last year."}
              </Text>

              <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5 }}>
                {weather.days.map((day) => (
                  <Paper key={day.date} radius="md" p="sm" bg="maroon.0" ta="center">
                    <Text size="xs" c="dimmed">{formatDate(day.date)}</Text>
                    <Text fz={30}>{day.emoji}</Text>
                    <Text fw={800}>{day.maxTemp}° / {day.minTemp}°</Text>
                    <Text size="sm">{day.label}</Text>
                    <Text size="xs" c="dimmed">{day.rain}</Text>
                  </Paper>
                ))}
              </SimpleGrid>
            </div>
          )}
        </Card>

        {/* Organiser only, after the plan is final: mark the trip as completed */}
        {isOrganiser && trip.status === "finalised" && (
          <Card mb="lg">
            <Group justify="space-between">
              <div>
                <Title order={3}>Back from the trip?</Title>
                <Text c="dimmed" size="sm">Marking it completed lets everyone write a review.</Text>
              </div>
              <Button leftSection={<Flag size={16} />} onClick={handleComplete}>Mark trip as completed</Button>
            </Group>
          </Card>
        )}

        {trip.status === "completed" && (
          <Alert color="green" variant="light" mb="lg" title="Trip completed">
            <Anchor component={Link} to="/reviews">Write a review</Anchor> of {trip.destination}.
          </Alert>
        )}

        {/* Organiser only: archive or delete the trip */}
        {isOrganiser && (
          <Card>
            <Title order={3}>Manage trip</Title>
            <Text c="dimmed" size="sm" mb="md">
              Archive keeps the trip but hides it from your main list. Delete removes it for everyone.
            </Text>
            <Group>
              {trip.status !== "archived" && (
                <Button variant="default" leftSection={<Archive size={16} />} onClick={handleArchive}>Archive trip</Button>
              )}
              <Button color="red" variant="light" leftSection={<Trash2 size={16} />} onClick={handleDelete}>Delete trip</Button>
            </Group>
          </Card>
        )}
      </section>
    </div>
  );
}

export default TripDetailsPage;
