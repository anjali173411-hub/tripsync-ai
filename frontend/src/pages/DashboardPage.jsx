// Home page: a welcome banner, invitations, and my trips (FR-2.6)

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, MapPin, CalendarDays, Users, Navigation, ArrowRight } from "lucide-react";
import api, { getErrorMessage, formatDateRange, travelModeText } from "../api/axios.js";

function DashboardPage() {
  const [trips, setTrips] = useState([]);
  const [invitations, setInvitations] = useState([]); // trips I was invited to
  const [message, setMessage] = useState("");
  const [destinations, setDestinations] = useState([]); // used to find a photo for each trip
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
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setLoading(false);
  }

  // Accept an invitation: I join the trip
  async function handleAccept(tripId) {
    setMessage("");
    setError("");

    try {
      const response = await api.post("/trips/" + tripId + "/invitation/accept");
      setMessage(response.data.message);
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Decline an invitation
  async function handleDecline(tripId) {
    const sure = window.confirm("Decline this invitation?");
    if (!sure) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await api.post("/trips/" + tripId + "/invitation/decline");
      setMessage(response.data.message);
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Finds the photo for a trip, using the destination with the same name.
  // Returns "" if the admin hasn't added a photo for that place.
  function getTripImage(trip) {
    const tripPlace = trip.destination.trim().toLowerCase();

    for (let i = 0; i < destinations.length; i++) {
      const place = destinations[i].name.trim().toLowerCase();
      if (place === tripPlace) {
        // Use the first photo the admin added, if any
        if (destinations[i].images.length > 0) {
          return destinations[i].images[0];
        }
        return "";
      }
    }

    return "";
  }

  // "4 members · Group trip" or "Solo trip"
  function getTripPeopleText(trip) {
    if (trip.type === "solo") {
      return "Solo trip";
    }
    if (trip.members.length === 1) {
      return "1 member · Group trip";
    }
    return trip.members.length + " members · Group trip";
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
  function drawTripCard(trip) {
    const image = getTripImage(trip);

    let route = trip.destination;
    if (trip.startingFrom) {
      route = trip.startingFrom + " → " + trip.destination;
    }

    return (
      <Link to={"/trips/" + trip._id} key={trip._id} className="trip-tile">
        {/* Top of the card: photo of the place (or a coloured box), with the name on top */}
        <div className="trip-tile-cover">
          {image && <img className="trip-tile-image" src={image} alt={trip.destination} />}
          {!image && (
            <div className="trip-tile-image trip-tile-image-empty">
              <MapPin size={40} />
            </div>
          )}

          <span className={"pill pill-" + trip.status + " cover-pill"}>{trip.status}</span>
          <span className="countdown">{getCountdownText(trip)}</span>

          <div className="cover-text">
            <h3>{trip.title}</h3>
            <span><MapPin size={14} /> {trip.destination}</span>
          </div>
        </div>

        {/* Bottom of the card: the trip details, one per line with an icon */}
        <div className="trip-tile-body">
          <p><Navigation size={15} /> {route}</p>
          <p><CalendarDays size={15} /> {formatDateRange(trip.startDate, trip.endDate)}</p>
          <p><Users size={15} /> {getTripPeopleText(trip)}</p>
          {trip.travelMode && <p className="travel-chip">{travelModeText(trip.travelMode)}</p>}
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
    return <p>Loading your trips...</p>;
  }

  return (
    <div className="dashboard">
      {/* Welcome banner */}
      <div className="card hero">
        <p className="eyebrow">Your travel dashboard</p>
        <h1>Plan something amazing.</h1>
        <p className="muted">Your trips, your people, one shared plan.</p>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {/* Invitations from other people (FR-2.4) */}
      {invitations.length > 0 && (
        <div>
          <h2 className="section-title">Invitations</h2>

          {invitations.map((trip) => (
            <div key={trip._id} className="card invitation">
              <div>
                <h3>{trip.title}</h3>
                <p className="muted">
                  {trip.organiser.name} invited you · 📍 {trip.destination} ·{" "}
                  {formatDateRange(trip.startDate, trip.endDate)}
                </p>
              </div>

              <div className="invitation-buttons">
                <button onClick={() => handleAccept(trip._id)}>Accept</button>
                <button className="btn-outline" onClick={() => handleDecline(trip._id)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">Your trips</h2>

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
          <h2 className="section-title">Archived trips</h2>
          <div className="trip-grid">
            {archivedTrips.map((trip) => drawTripCard(trip))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
