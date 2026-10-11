// Main page of one trip: the details, the weather, and archive / delete / complete.

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader } from "@mantine/core";
import api, { getErrorMessage, getCurrentUser, formatDate, formatMoney, travelModeText } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";

function TripDetailsPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [trip, setTrip] = useState(null);
  const [currency, setCurrency] = useState("");
  const [weather, setWeather] = useState(null); // { place, type, days }
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

    // Weather is loaded separately, so the page still works if the weather service is down
    try {
      const weatherResponse = await api.get("/trips/" + tripId + "/weather");
      setWeather(weatherResponse.data);
    } catch (err) {
      setWeatherMessage(getErrorMessage(err));
    }
  }

  // Organiser archives the trip: it is kept, but moved to "Archived trips" (FR-2.7)
  async function handleArchive() {
    if (!window.confirm("Archive this trip? It moves to 'Archived trips' on your dashboard.")) {
      return;
    }
    try {
      await api.patch("/trips/" + tripId + "/archive");
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Organiser deletes the trip and everything in it (FR-2.7)
  async function handleDelete() {
    if (!window.confirm("Delete this trip for everyone? This cannot be undone.")) {
      return;
    }
    try {
      await api.delete("/trips/" + tripId);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Organiser marks the trip as completed after coming back
  async function handleComplete() {
    if (!window.confirm("Mark this trip as completed?")) {
      return;
    }
    try {
      await api.patch("/trips/" + tripId + "/complete");
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (!trip) {
    if (error) {
      return <p className="error-box">{error}</p>;
    }
    return <div className="center-box"><Loader /></div>;
  }

  const isOrganiser = trip.organiser._id === user.id;

  // The banner shows the place photo if there is one
  let bannerStyle = {};
  if (trip.destinationImage) {
    bannerStyle = { backgroundImage: "url(" + trip.destinationImage + ")" };
  }

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        {/* Photo banner with the trip name */}
        <div className="trip-banner" style={bannerStyle}>
          <div className="trip-banner-text">
            <span className="tag">{trip.status}</span>
            <h1>{trip.title}</h1>
            <p>{trip.startingFrom} → {trip.destination}</p>
          </div>
        </div>

        {error && <p className="error-box">{error}</p>}

        {/* Trip details */}
        <div className="grid">
          <div className="box">
            <p className="label">Dates</p>
            <p>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</p>
          </div>
          <div className="box">
            <p className="label">Travelling by</p>
            <p>{travelModeText(trip.travelMode)}</p>
          </div>
          <div className="box">
            <p className="label">Total budget</p>
            <p>{formatMoney(trip.budget, currency)}</p>
          </div>
          <div className="box">
            <p className="label">Type</p>
            <p>{trip.type === "solo" ? "Solo trip" : "Group trip, " + trip.members.length + " member(s)"}</p>
          </div>
          <div className="box">
            <p className="label">Organiser</p>
            <p>{trip.organiser.name}</p>
          </div>
        </div>

        {/* Weather for each day of the trip */}
        <div className="box">
          <h3>Weather</h3>
          {!weather && <p className="muted">{weatherMessage}</p>}

          {weather && (
            <div>
              <p className="muted small">
                {weather.place}
                {weather.type === "typical" && " · The trip is far away, so this is the weather on the same dates last year."}
              </p>
              <div className="grid">
                {weather.days.map((day) => (
                  <div key={day.date} className="weather-day">
                    <p className="small">{formatDate(day.date)}</p>
                    <p className="weather-emoji">{day.emoji}</p>
                    <b>{day.maxTemp}° / {day.minTemp}°</b>
                    <p className="small muted">{day.label}, {day.rain}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {trip.status === "completed" && (
          <p className="success-box">This trip is completed. Welcome back!</p>
        )}

        {/* Organiser only */}
        {isOrganiser && (
          <div className="box">
            <h3>Manage trip</h3>
            <div className="button-row">
              {trip.status === "finalised" && <button onClick={handleComplete}>Mark as completed</button>}
              {trip.status !== "archived" && <button className="outline-button" onClick={handleArchive}>Archive trip</button>}
              <button className="danger-button" onClick={handleDelete}>Delete trip</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default TripDetailsPage;
