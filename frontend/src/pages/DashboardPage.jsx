// Home page: welcome banner, invitations, and my trips as cards (FR-2.6)

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import api, { getErrorMessage, formatDateRange, formatMoney, getCurrentUser } from "../api/axios.js";

function DashboardPage() {
  const user = getCurrentUser();

  const [trips, setTrips] = useState([]);
  const [invitations, setInvitations] = useState([]); // trips I was invited to
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const tripsResponse = await api.get("/trips");
      setTrips(tripsResponse.data.trips);

      const invitationsResponse = await api.get("/trips/invitations/mine");
      setInvitations(invitationsResponse.data.invitations);

      const optionsResponse = await api.get("/options");
      setCurrency(optionsResponse.data.currency);
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setLoading(false);
  }

  // Accept an invitation: I join the trip
  async function handleAccept(tripId) {
    try {
      const response = await api.post("/trips/" + tripId + "/invitation/accept");
      notifications.show({ message: response.data.message, color: "green" });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDecline(tripId) {
    if (!window.confirm("Decline this invitation?")) {
      return;
    }
    try {
      await api.post("/trips/" + tripId + "/invitation/decline");
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Draws one trip card: photo with the name on it, then the details
  function drawTripCard(trip) {
    return (
      <Link to={"/trips/" + trip._id} key={trip._id} className="trip-tile">
        <div className="trip-tile-cover">
          {trip.destinationImage && <img className="trip-tile-image" src={trip.destinationImage} alt={trip.destination} />}
          {!trip.destinationImage && <div className="trip-tile-image trip-tile-image-empty" />}
          <div className="cover-text">
            <h3>{trip.title}</h3>
            <span>{trip.startingFrom} → {trip.destination}</span>
          </div>
        </div>

        <div className="trip-tile-body">
          <p><span className="tag">{trip.status}</span></p>
          <p>{formatDateRange(trip.startDate, trip.endDate)}</p>
          <p>{trip.type === "solo" ? "Solo trip" : trip.members.length + " member(s)"} · {formatMoney(trip.budget, currency)}</p>
        </div>
      </Link>
    );
  }

  if (loading) {
    return <div className="center-box"><Loader /></div>;
  }

  // Split my trips into active and archived (FR-2.7)
  const activeTrips = [];
  const archivedTrips = [];
  for (let i = 0; i < trips.length; i++) {
    if (trips[i].status === "archived") {
      archivedTrips.push(trips[i]);
    } else {
      activeTrips.push(trips[i]);
    }
  }

  return (
    <div>
      {/* Welcome banner */}
      <div className="hero">
        <h1>Hi {user.name}, plan something amazing.</h1>
        <p>Your trips, your people, one shared plan.</p>
        <Link to="/trips/new" className="hero-button">+ New trip</Link>
      </div>

      {error && <p className="error-box">{error}</p>}

      {/* Invitations from other people (FR-2.4) */}
      {invitations.length > 0 && (
        <div className="box">
          <h2>Invitations</h2>
          {invitations.map((trip) => (
            <div key={trip._id} className="row">
              <div>
                <b>{trip.title}</b>
                <p className="muted small">{trip.organiser.name} invited you · {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)}</p>
              </div>
              <div className="button-row">
                <button className="small-button" onClick={() => handleAccept(trip._id)}>Accept</button>
                <button className="small-button outline-button" onClick={() => handleDecline(trip._id)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2>Your trips</h2>
      <div className="trip-grid">
        <Link to="/trips/new" className="add-trip-card">
          <span className="add-trip-icon">+</span>
          <span className="add-trip-text">New trip</span>
        </Link>
        {activeTrips.map((trip) => drawTripCard(trip))}
      </div>

      {archivedTrips.length > 0 && (
        <div>
          <h2>Archived trips</h2>
          <div className="trip-grid">
            {archivedTrips.map((trip) => drawTripCard(trip))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
