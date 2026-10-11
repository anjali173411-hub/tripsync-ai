// Home page: a welcome banner, invitations, and my trips (FR-2.6)
// Built with Mantine components (Paper, Card, Badge, Avatar, Button ...).

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Paper, Card, Title, Text, Button, Badge, Avatar, Group, SimpleGrid, Alert, ThemeIcon, Center, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { Plus, MapPin, CalendarDays, Users, Wallet, ArrowRight, Plane, Mail, Archive } from "lucide-react";
import api, { getErrorMessage, formatDateRange, travelModeText, formatMoney, getCurrentUser } from "../api/axios.js";

function DashboardPage() {
  const [trips, setTrips] = useState([]);
  const [invitations, setInvitations] = useState([]); // trips I was invited to
  const [destinations, setDestinations] = useState([]); // used to find a photo for each trip
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Runs once when the page opens
  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const tripsResponse = await api.get("/trips");
      setTrips(tripsResponse.data.trips);

      const invitationsResponse = await api.get("/trips/invitations/mine");
      setInvitations(invitationsResponse.data.invitations);

      const destinationsResponse = await api.get("/destinations");
      setDestinations(destinationsResponse.data.destinations);

      const optionsResponse = await api.get("/options");
      setCurrency(optionsResponse.data.currency);
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setLoading(false);
  }

  // Accept an invitation: I join the trip
  async function handleAccept(tripId) {
    setError("");

    try {
      const response = await api.post("/trips/" + tripId + "/invitation/accept");
      notifications.show({ title: "Joined! 🎉", message: response.data.message, color: "green" });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Decline an invitation - first asks "Are you sure?" in a pop-up
  function handleDecline(trip) {
    modals.openConfirmModal({
      title: "Decline this invitation?",
      children: <Text size="sm">You won't be part of "{trip.title}". The organiser can invite you again later.</Text>,
      labels: { confirm: "Decline", cancel: "Keep it" },
      confirmProps: { color: "red" },
      onConfirm: () => declineInvitation(trip._id)
    });
  }

  async function declineInvitation(tripId) {
    setError("");

    try {
      const response = await api.post("/trips/" + tripId + "/invitation/decline");
      notifications.show({ message: response.data.message });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Finds the photo for a trip:
  //   1. the admin's photo of the destination with the same name, if there is one
  //   2. otherwise the photo the backend found on Wikipedia
  // Returns "" if there is no photo at all.
  function getTripImage(trip) {
    const tripPlace = trip.destination.trim().toLowerCase();

    for (let i = 0; i < destinations.length; i++) {
      const place = destinations[i].name.trim().toLowerCase();
      if (place === tripPlace) {
        // Use the first photo the admin added, if any
        if (destinations[i].images.length > 0) {
          return destinations[i].images[0];
        }
      }
    }

    if (trip.destinationImage) {
      return trip.destinationImage;
    }
    return "";
  }

  // "4 members", "1 member" or "Just you"
  function getTripPeopleText(trip) {
    if (trip.type === "solo") {
      return "Just you";
    }
    if (trip.members.length === 1) {
      return "1 member";
    }
    return trip.members.length + " members";
  }

  // A small countdown for the card: "In 12 days", "Tomorrow", "On the trip now" or "Trip over"
  function getCountdownText(trip) {
    const oneDay = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(trip.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(trip.endDate);
    end.setHours(0, 0, 0, 0);

    const daysToGo = Math.round((start - today) / oneDay);

    if (daysToGo > 1) {
      return "In " + daysToGo + " days";
    }
    if (daysToGo === 1) {
      return "Tomorrow";
    }
    if (today <= end) {
      return "On the trip now";
    }
    return "Trip over";
  }

  // Draws one trip card. Clicking it opens the trip.
  // Top: a photo of the place with the trip name on it. Below: a white panel with the details.
  function drawTripCard(trip) {
    const image = getTripImage(trip);

    let fromText = "Trip to " + trip.destination;
    if (trip.startingFrom) {
      fromText = trip.startingFrom + " → " + trip.destination;
    }

    return (
      <Link to={"/trips/" + trip._id} key={trip._id} className="trip-tile">
        {/* The photo, with the name and status on top of it */}
        <div className="trip-tile-cover">
          {image && <img className="trip-tile-image" src={image} alt={trip.destination} />}
          {!image && (
            <div className="trip-tile-image trip-tile-image-empty">
              <MapPin size={40} />
            </div>
          )}

          <Badge className="countdown" color="white" c="maroon.9" size="lg">
            {getCountdownText(trip)}
          </Badge>

          <div className="cover-text">
            <h3>{trip.title}</h3>
            <span>{fromText}</span>
          </div>
          <Badge className="cover-pill" color="yellow.4" c="dark.8" size="lg">{trip.status}</Badge>
        </div>

        {/* The white panel that slides up over the photo */}
        <div className="trip-tile-body">
          <span className="panel-handle" />
          <p className="panel-label">Trip details</p>

          <div className="detail-row">
            <CalendarDays size={16} />
            <span>Dates</span>
            <b>{formatDateRange(trip.startDate, trip.endDate)}</b>
          </div>
          <div className="detail-row">
            <Users size={16} />
            <span>{trip.type === "solo" ? "Solo trip" : "Group trip"}</span>
            <b>{getTripPeopleText(trip)}</b>
          </div>
          <div className="detail-row">
            <Wallet size={16} />
            <span>Budget</span>
            <b>{formatMoney(trip.budget, currency)}</b>
          </div>
          {trip.travelMode && (
            <div className="detail-row">
              <MapPin size={16} />
              <span>Travel by</span>
              <b>{travelModeText(trip.travelMode)}</b>
            </div>
          )}
        </div>

        <div className="trip-tile-footer">
          Open trip <ArrowRight size={16} />
        </div>
      </Link>
    );
  }

  // Split my trips into active ones and archived ones
  const activeTrips = [];
  const archivedTrips = [];
  for (let i = 0; i < trips.length; i++) {
    if (trips[i].status === "archived") {
      archivedTrips.push(trips[i]);
    } else {
      activeTrips.push(trips[i]);
    }
  }

  if (loading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  const user = getCurrentUser();

  return (
    <div className="dashboard">
      {/* Welcome banner */}
      <Paper className="hero" radius="lg" p="xl" mb="lg">
        <Group justify="space-between" align="center">
          <div>
            <Text className="eyebrow">Your travel dashboard</Text>
            <Title order={1}>Hi {user.name}, plan something amazing.</Title>
            <Text c="white" opacity={0.8}>Your trips, your people, one shared plan.</Text>
          </div>
          <Button component={Link} to="/trips/new" size="md" variant="white" leftSection={<Plus size={18} />}>
            New trip
          </Button>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
        <Paper withBorder radius="lg" p="md">
          <Group>
            <ThemeIcon size={42} radius="md" variant="light"><Plane size={20} /></ThemeIcon>
            <div>
              <Text size="xl" fw={800}>{activeTrips.length}</Text>
              <Text size="sm" c="dimmed">Active trips</Text>
            </div>
          </Group>
        </Paper>
        <Paper withBorder radius="lg" p="md">
          <Group>
            <ThemeIcon size={42} radius="md" variant="light" color="yellow"><Mail size={20} /></ThemeIcon>
            <div>
              <Text size="xl" fw={800}>{invitations.length}</Text>
              <Text size="sm" c="dimmed">Invitations</Text>
            </div>
          </Group>
        </Paper>
        <Paper withBorder radius="lg" p="md">
          <Group>
            <ThemeIcon size={42} radius="md" variant="light" color="gray"><Archive size={20} /></ThemeIcon>
            <div>
              <Text size="xl" fw={800}>{archivedTrips.length}</Text>
              <Text size="sm" c="dimmed">Archived</Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {error && <Alert color="red" variant="light" mb="md">{error}</Alert>}

      {/* Invitations from other people (FR-2.4) */}
      {invitations.length > 0 && (
        <div>
          <Title order={2} className="section-title">Invitations</Title>

          {invitations.map((trip) => (
            <Card key={trip._id} mb="sm" className="invitation-card">
              <Group justify="space-between">
                <Group>
                  <Avatar color="maroon" radius="xl">{trip.organiser.name.charAt(0).toUpperCase()}</Avatar>
                  <div>
                    <Text fw={700}>{trip.title}</Text>
                    <Text size="sm" c="dimmed">
                      {trip.organiser.name} invited you · 📍 {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)}
                    </Text>
                  </div>
                </Group>

                <Group gap="xs">
                  <Button onClick={() => handleAccept(trip._id)}>Accept</Button>
                  <Button variant="default" onClick={() => handleDecline(trip)}>Decline</Button>
                </Group>
              </Group>
            </Card>
          ))}
        </div>
      )}

      <Title order={2} className="section-title">Your trips</Title>

      <div className="trip-grid">
        {/* First card: the "+" card for adding a new trip */}
        <Link to="/trips/new" className="add-trip-card">
          <span className="add-trip-icon"><Plus size={32} /></span>
          <span className="add-trip-text">New trip</span>
          <span className="muted small">Plan a solo or group trip</span>
        </Link>

        {/* Then one card for each trip. Clicking a card opens the trip,
            where you add members, preferences and everything else. */}
        {activeTrips.map((trip) => drawTripCard(trip))}
      </div>

      {/* Archived trips, kept separately (FR-2.7) */}
      {archivedTrips.length > 0 && (
        <div>
          <Title order={2} className="section-title">Archived trips</Title>
          <div className="trip-grid">
            {archivedTrips.map((trip) => drawTripCard(trip))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
