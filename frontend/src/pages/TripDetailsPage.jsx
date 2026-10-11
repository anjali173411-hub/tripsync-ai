// Main page of one trip: the key details and the steps to plan it.

import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api, { getErrorMessage, getCurrentUser, formatDate, formatMoney, travelModeText } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Message from "../components/ui/Message.jsx";
import Loading from "../components/ui/Loading.jsx";

function TripDetailsPage() {
  const { tripId } = useParams(); // the trip id from the web address
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [trip, setTrip] = useState(null);
  const [currency, setCurrency] = useState("");
  const [weather, setWeather] = useState(null);        // { place, type, days }
  const [weatherMessage, setWeatherMessage] = useState("Loading weather...");
  const [error, setError] = useState("");

  // Runs when the page opens
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

  // Weather is loaded separately, so the page still works if the weather service is down
  async function loadWeather() {
    try {
      const response = await api.get("/trips/" + tripId + "/weather");
      setWeather(response.data);
    } catch (err) {
      setWeatherMessage(getErrorMessage(err));
    }
  }

  // The heading above the weather, depending on what kind of weather we got
  function getWeatherTitle() {
    if (weather.type === "forecast") {
      return "Weather forecast";
    }
    if (weather.type === "past") {
      return "Weather on your trip";
    }
    return "Typical weather for these dates";
  }

  // Organiser archives the trip: it is kept, but moved to "Archived trips" (FR-2.7)
  async function handleArchive() {
    const sure = window.confirm("Archive this trip? It will move to 'Archived trips' on your dashboard.");
    if (!sure) {
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
    const sure = window.confirm(
      "Delete this trip for everyone? The itinerary, votes, expenses and preferences will be deleted. This cannot be undone."
    );
    if (!sure) {
      return;
    }

    try {
      await api.delete("/trips/" + tripId);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Organiser clicks "Mark trip as completed" (this unlocks reviews)
  async function handleComplete() {
    const sure = window.confirm("Mark this trip as completed? Members can then write reviews.");
    if (!sure) {
      return;
    }

    try {
      await api.patch("/trips/" + tripId + "/complete");
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Still loading
  if (!trip) {
    if (error) {
      return <Message type="error" text={error} />;
    }
    return <Loading text="Loading trip..." />;
  }

  const isOrganiser = trip.organiser._id === user.id;

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <h1>{trip.title}</h1>

        {/* Trip details */}
        <Card>
          <div className="details">
            <div>
              <span className="muted">Route</span>
              <p>{trip.startingFrom ? trip.startingFrom + " → " : "📍 "}{trip.destination}</p>
            </div>
            {trip.travelMode && (
              <div>
                <span className="muted">Travelling by</span>
                <p>{travelModeText(trip.travelMode)}</p>
              </div>
            )}
            <div>
              <span className="muted">Dates</span>
              <p>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</p>
            </div>
            <div>
              <span className="muted">Total budget (everyone)</span>
              <p>{formatMoney(trip.budget, currency)}</p>
            </div>
            <div>
              <span className="muted">Type</span>
              <p>{trip.type}</p>
            </div>
            <div>
              <span className="muted">Organiser</span>
              <p>{trip.organiser.name}</p>
            </div>
            <div>
              <span className="muted">Status</span>
              <p>{trip.status}</p>
            </div>
          </div>
        </Card>

        {/* Weather for each day of the trip */}
        <Card>
          {!weather && (
            <div>
              <h2>Weather</h2>
              <p className="muted">{weatherMessage}</p>
            </div>
          )}

          {weather && (
            <div>
              <h2>{getWeatherTitle()}</h2>
              <p className="muted small">
                {weather.place}
                {weather.type === "typical" &&
                  " · Your trip is too far away for a real forecast, so this shows the weather on the same dates last year."}
              </p>

              <div className="weather-row">
                {weather.days.map((day) => (
                  <div key={day.date} className="weather-day">
                    <span className="muted small">{formatDate(day.date)}</span>
                    <span className="weather-emoji">{day.emoji}</span>
                    <strong>{day.maxTemp}° / {day.minTemp}°</strong>
                    <span className="small">{day.label}</span>
                    <span className="muted small">{day.rain}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Only the organiser sees this, and only after the itinerary is finalised */}
        {/* Organiser only: archive or delete the trip */}
        {isOrganiser && (
          <Card>
            <h2>Manage trip</h2>
            <p className="muted small">
              Archive keeps the trip but hides it from your main list. Delete removes it for everyone.
            </p>
            <div className="button-row">
              {trip.status !== "archived" && (
                <Button variant="outline" onClick={handleArchive}>Archive trip</Button>
              )}
              <Button variant="danger" onClick={handleDelete}>Delete trip</Button>
            </div>
          </Card>
        )}

        {isOrganiser && trip.status === "finalised" && (
          <Card>
            <h2>Back from the trip?</h2>
            <Button onClick={handleComplete}>Mark trip as completed</Button>
          </Card>
        )}

        {trip.status === "completed" && (
          <Card>
            <p>This trip is completed. <Link to="/reviews">Write a review</Link> of {trip.destination}.</p>
          </Card>
        )}

        <Message type="error" text={error} />
      </section>
    </div>
  );
}

export default TripDetailsPage;
