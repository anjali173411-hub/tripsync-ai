import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Chip, TagsInput, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import api, { getErrorMessage } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";

function PreferencesPage() {
  const { tripId } = useParams();

  const [trip, setTrip] = useState(null);
  const [options, setOptions] = useState(null);

  const [interests, setInterests] = useState([]);
  const [otherInterests, setOtherInterests] = useState([]);
  const [pace, setPace] = useState("");
  const [foodPreference, setFoodPreference] = useState("");
  const [stayBudget, setStayBudget] = useState("");
  const [stayType, setStayType] = useState("");
  const [mustDo, setMustDo] = useState([]);
  const [dealBreakers, setDealBreakers] = useState([]);
  const [freeTextNotes, setFreeTextNotes] = useState("");

  const [description, setDescription] = useState("");
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPage();
  }, [tripId]);

  async function loadPage() {
    try {
      const tripResponse = await api.get("/trips/" + tripId);
      setTrip(tripResponse.data.trip);

      const optionsResponse = await api.get("/options");
      setOptions(optionsResponse.data);

      const prefResponse = await api.get("/trips/" + tripId + "/preferences/me");
      if (prefResponse.data.preference) {
        fillForm(prefResponse.data.preference);
      } else {
        const profileResponse = await api.get("/profile");
        fillForm(profileResponse.data.user.defaultPreferences);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function fillForm(data) {
    setInterests(data.interests || []);
    setOtherInterests(data.otherInterests || []);
    setMustDo(data.mustDo || []);
    setDealBreakers(data.dealBreakers || []);
    if (data.pace) setPace(data.pace);
    if (data.foodPreference) setFoodPreference(data.foodPreference);
    if (data.stayBudget) setStayBudget(data.stayBudget);
    if (data.stayType) setStayType(data.stayType);
    if (data.freeTextNotes) setFreeTextNotes(data.freeTextNotes);
  }

  async function handleFillFromText() {
    setError("");
    setFilling(true);
    try {
      const response = await api.post("/trips/" + tripId + "/preferences/from-text", { text: description });
      fillForm(response.data.preferences);
      setFreeTextNotes(description);
      notifications.show({ message: "Form filled in. Check it, then click Save.", color: "green" });
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setFilling(false);
  }

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    try {
      await api.put("/trips/" + tripId + "/preferences", {
        interests: interests,
        otherInterests: otherInterests,
        pace: pace,
        foodPreference: foodPreference || undefined,
        stayBudget: stayBudget || undefined,
        stayType: stayType || undefined,
        mustDo: mustDo,
        dealBreakers: dealBreakers,
        freeTextNotes: freeTextNotes
      });
      notifications.show({ message: "Preferences saved", color: "green" });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (!trip || !options) {
    if (error) {
      return <p className="error-box">{error}</p>;
    }
    return <div className="center-box"><Loader /></div>;
  }

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <h1>My Preferences</h1>

        <div className="box">
          <h3>Describe your ideal trip</h3>
          <p className="muted small">Write it like a message to a friend. The AI fills in the form below.</p>
          <textarea
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="I'm vegetarian and want a relaxed trip with beaches. No water sports. A cheap homestay is fine."
          />
          <button onClick={handleFillFromText} disabled={filling || description.length < 10}>
            {filling ? "Filling..." : "Fill with AI"}
          </button>
        </div>

        {error && <p className="error-box">{error}</p>}

        <form className="box" onSubmit={handleSave}>
          <h3>Your answers</h3>

          <label>Interests (pick any)</label>
          <Chip.Group multiple value={interests} onChange={setInterests}>
            <div className="chip-list">
              {options.interestOptions.map((interest) => (
                <Chip key={interest} value={interest}>{interest}</Chip>
              ))}
            </div>
          </Chip.Group>

          <label>Other interests (type one and press Enter)</label>
          <TagsInput value={otherInterests} onChange={setOtherInterests} />

          <div className="two-columns">
            <div>
              <label>How busy should each day be?</label>
              <select value={pace} onChange={(e) => setPace(e.target.value)}>
                <option value="">Choose...</option>
                {options.paceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label>Food</label>
              <select value={foodPreference} onChange={(e) => setFoodPreference(e.target.value)}>
                <option value="">Choose...</option>
                {options.foodOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label>Stay budget</label>
              <select value={stayBudget} onChange={(e) => setStayBudget(e.target.value)}>
                <option value="">Choose...</option>
                {options.stayBudgets.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label>Type of stay</label>
              <select value={stayType} onChange={(e) => setStayType(e.target.value)}>
                <option value="">Choose...</option>
                {options.stayTypes.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <label>Must do (press Enter after each)</label>
          <TagsInput value={mustDo} onChange={setMustDo} />

          <label>Things to avoid (press Enter after each)</label>
          <TagsInput value={dealBreakers} onChange={setDealBreakers} />

          <label>Anything else?</label>
          <textarea rows="2" value={freeTextNotes} onChange={(e) => setFreeTextNotes(e.target.value)} />

          <div className="button-row">
            <button type="submit">Save preferences</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default PreferencesPage;
