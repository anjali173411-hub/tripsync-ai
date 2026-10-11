// Create a new solo or group trip (FR-2.1, FR-2.2)

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getErrorMessage, travelModeText } from "../api/axios.js";
import Button from "../components/ui/Button.jsx";
import Message from "../components/ui/Message.jsx";

function CreateTripPage() {
  const navigate = useNavigate();

  // Choices that come from the backend
  const [tripTypes, setTripTypes] = useState([]);
  const [currency, setCurrency] = useState("");

  // What the user types
  const [title, setTitle] = useState("");
  const [startingFrom, setStartingFrom] = useState("");
  const [destination, setDestination] = useState("");
  const [type, setType] = useState("");
  const [travelModes, setTravelModes] = useState([]); // choices from the backend
  const [travelMode, setTravelMode] = useState("");   // the one the user picked
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");

  const [error, setError] = useState("");

  // Runs once when the page opens
  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    const response = await api.get("/options");
    setTripTypes(response.data.tripTypes);
    setCurrency(response.data.currency);
    setType(response.data.tripTypes[0]); // pick the first type by default
    setTravelModes(response.data.travelModes);
  }

  // Runs when the form is submitted
  async function handleCreate(event) {
    event.preventDefault();
    setError("");

    if (!travelMode) {
      setError("Please choose how you are travelling");
      return;
    }

    if (endDate < startDate) {
      setError("End date must be on or after the start date");
      return;
    }

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

      // Open the new trip
      navigate("/trips/" + response.data.trip._id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form className="card narrow-wide" onSubmit={handleCreate}>
      <h1>Plan a new trip</h1>

      <label>Trip name</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} required />

      <div className="two-columns">
        <div>
          <label>From (where you start)</label>
          <input
            value={startingFrom}
            onChange={(e) => setStartingFrom(e.target.value)}
            placeholder="e.g. Chennai"
            required
          />
        </div>
        <div>
          <label>To (destination)</label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Goa"
            required
          />
        </div>
      </div>

      <label>Who is going?</label>
      <div className="chip-list">
        {tripTypes.map((tripType) => (
          <button
            type="button"
            key={tripType}
            className={type === tripType ? "chip selected" : "chip"}
            onClick={() => setType(tripType)}
          >
            {tripType}
          </button>
        ))}
      </div>
      <p className="muted small">You can invite people to a group trip after creating it.</p>

      <label>How are you travelling?</label>
      <div className="chip-list">
        {travelModes.map((mode) => (
          <button
            type="button"
            key={mode}
            className={travelMode === mode ? "chip selected" : "chip"}
            onClick={() => setTravelMode(mode)}
          >
            {travelModeText(mode)}
          </button>
        ))}
      </div>

      <div className="two-columns">
        <div>
          <label>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <label>End date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
      </div>

      <label>Total budget for the whole trip ({currency})</label>
      <input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} required />
      <p className="muted small">
        For a group trip, this is the budget for everyone together, not per person.
      </p>

      <Message type="error" text={error} />

      <Button type="submit">Create trip</Button>
    </form>
  );
}

export default CreateTripPage;
