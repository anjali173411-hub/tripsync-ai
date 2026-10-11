// Create a new solo or group trip (FR-2.1, FR-2.2)

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import api, { getErrorMessage, travelModeText } from "../api/axios.js";

function CreateTripPage() {
  const navigate = useNavigate();

  // Choices that come from the backend
  const [tripTypes, setTripTypes] = useState([]);
  const [travelModes, setTravelModes] = useState([]);
  const [currency, setCurrency] = useState("");

  // What the user fills in
  const [title, setTitle] = useState("");
  const [startingFrom, setStartingFrom] = useState("");
  const [destination, setDestination] = useState("");
  const [type, setType] = useState("solo");
  const [travelMode, setTravelMode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");

  const [error, setError] = useState("");

  // Today as "2026-10-11", so past dates can't be picked
  const today = new Date().toLocaleDateString("en-CA");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    const response = await api.get("/options");
    setTripTypes(response.data.tripTypes);
    setTravelModes(response.data.travelModes);
    setCurrency(response.data.currency);
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError("");

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

      notifications.show({ message: "Trip created", color: "green" });
      navigate("/trips/" + response.data.trip._id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form className="box narrow-box" onSubmit={handleCreate}>
      <h1>Where are you going?</h1>

      <label>Trip name</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goa with friends" required />

      <div className="two-columns">
        <div>
          <label>From</label>
          <input value={startingFrom} onChange={(e) => setStartingFrom(e.target.value)} placeholder="Chennai" required />
        </div>
        <div>
          <label>To</label>
          <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Goa" required />
        </div>
      </div>

      <div className="two-columns">
        <div>
          <label>Who is going?</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {tripTypes.map((tripType) => (
              <option key={tripType} value={tripType}>{tripType === "solo" ? "Just me" : "With friends"}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Travelling by</label>
          <select value={travelMode} onChange={(e) => setTravelMode(e.target.value)} required>
            <option value="">Choose...</option>
            {travelModes.map((mode) => (
              <option key={mode} value={mode}>{travelModeText(mode)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="two-columns">
        <div>
          <label>Start date</label>
          <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <label>End date</label>
          <input type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
      </div>

      <label>Total budget for everyone ({currency})</label>
      <input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="50000" required />

      {error && <p className="error-box">{error}</p>}

      <div className="button-row">
        <button type="submit">Create trip</button>
        <button type="button" className="outline-button" onClick={() => navigate("/")}>Cancel</button>
      </div>
    </form>
  );
}

export default CreateTripPage;
