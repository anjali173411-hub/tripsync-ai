// The preference form each member fills in (FR-3.1, FR-3.2).
// The AI uses these answers to plan the itinerary.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { getErrorMessage, splitByComma } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Message from "../components/ui/Message.jsx";
import Loading from "../components/ui/Loading.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

function PreferencesPage() {
  const { tripId } = useParams();

  const [trip, setTrip] = useState(null);

  // Choices that come from the backend
  const [interestOptions, setInterestOptions] = useState([]);
  const [paceOptions, setPaceOptions] = useState([]);
  const [foodOptions, setFoodOptions] = useState([]);
  const [stayBudgets, setStayBudgets] = useState([]);
  const [stayTypes, setStayTypes] = useState([]);
  const [currency, setCurrency] = useState("");

  // What the user fills in
  const [interests, setInterests] = useState([]);
  const [otherInterests, setOtherInterests] = useState(""); // typed in, separated by commas
  const [pace, setPace] = useState("");
  const [budgetContribution, setBudgetContribution] = useState("");
  const [mustDo, setMustDo] = useState("");
  const [dealBreakers, setDealBreakers] = useState("");
  const [freeTextNotes, setFreeTextNotes] = useState("");
  const [foodPreference, setFoodPreference] = useState("");
  const [stayBudget, setStayBudget] = useState("");
  const [stayType, setStayType] = useState("");

  // "Describe your trip" box: the AI fills in the form from this text (FR-3.2)
  const [description, setDescription] = useState("");
  const [filling, setFilling] = useState(false);
  const [fillMessage, setFillMessage] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Runs when the page opens
  useEffect(() => {
    loadPage();
  }, [tripId]);

  async function loadPage() {
    try {
      // 1. The trip (for the sidebar)
      const tripResponse = await api.get("/trips/" + tripId);
      setTrip(tripResponse.data.trip);

      // 2. The choices for the form
      const optionsResponse = await api.get("/options");
      setInterestOptions(optionsResponse.data.interestOptions);
      setPaceOptions(optionsResponse.data.paceOptions);
      setFoodOptions(optionsResponse.data.foodOptions);
      setStayBudgets(optionsResponse.data.stayBudgets);
      setStayTypes(optionsResponse.data.stayTypes);
      setCurrency(optionsResponse.data.currency);

      // 3. What I saved before (if anything), to fill the form
      const prefResponse = await api.get("/trips/" + tripId + "/preferences/me");
      const saved = prefResponse.data.preference;

      if (saved) {
        setInterests(saved.interests);
        setOtherInterests(saved.otherInterests.join(", "));
        setPace(saved.pace);
        setFoodPreference(saved.foodPreference);
        setStayBudget(saved.stayBudget);
        setStayType(saved.stayType);
        setBudgetContribution(saved.budgetContribution);
        setMustDo(saved.mustDo.join(", "));
        setDealBreakers(saved.dealBreakers.join(", "));
        setFreeTextNotes(saved.freeTextNotes);
      } else {
        // Nothing saved for this trip yet: start from my profile defaults (FR-1.4)
        const profileResponse = await api.get("/profile");
        const defaults = profileResponse.data.user.defaultPreferences;
        setInterests(defaults.interests);
        setPace(defaults.pace);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Tick or untick one interest
  function toggleInterest(interest) {
    if (interests.includes(interest)) {
      // Already ticked: remove it
      const newList = [];
      for (let i = 0; i < interests.length; i++) {
        if (interests[i] !== interest) {
          newList.push(interests[i]);
        }
      }
      setInterests(newList);
    } else {
      // Not ticked: add it
      setInterests([...interests, interest]);
    }
  }

  // Runs when the form is submitted
  // The AI reads the description and fills in the form below. Nothing is saved yet.
  async function handleFillFromText() {
    setFillMessage("");
    setMessage("");
    setError("");
    setFilling(true);

    try {
      const response = await api.post("/trips/" + tripId + "/preferences/from-text", {
        text: description
      });
      const filled = response.data.preferences;

      setInterests(filled.interests);
      setOtherInterests(filled.otherInterests.join(", "));
      setMustDo(filled.mustDo.join(", "));
      setDealBreakers(filled.dealBreakers.join(", "));

      // Only change these if the description mentioned them
      if (filled.pace) {
        setPace(filled.pace);
      }
      if (filled.foodPreference) {
        setFoodPreference(filled.foodPreference);
      }
      if (filled.stayBudget) {
        setStayBudget(filled.stayBudget);
      }
      if (filled.stayType) {
        setStayType(filled.stayType);
      }
      if (filled.budgetContribution > 0) {
        setBudgetContribution(filled.budgetContribution);
      }

      // Keep the description too, so the AI planner can read it
      setFreeTextNotes(description);

      setFillMessage("Done! Check the answers below, change anything you like, then click Save preferences.");
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setFilling(false);
  }

  async function handleSave(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await api.put("/trips/" + tripId + "/preferences", {
        interests: interests,
        otherInterests: splitByComma(otherInterests),
        pace: pace,
        foodPreference: foodPreference || undefined,
        stayBudget: stayBudget || undefined,
        stayType: stayType || undefined,
        budgetContribution: Number(budgetContribution),
        mustDo: splitByComma(mustDo),
        dealBreakers: splitByComma(dealBreakers),
        freeTextNotes: freeTextNotes
      });
      setMessage("Preferences saved!");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (!trip) {
    if (error) {
      return <Message type="error" text={error} />;
    }
    return <Loading text="Loading your preferences..." />;
  }

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <PageHeader title="My Preferences">
          Tell the AI what you want. You can change this until the organiser generates the itinerary.
        </PageHeader>

        {/* The easy way: describe the trip, and the AI fills in the form */}
        <Card className="describe-card">
          <h3>✨ Describe your ideal trip</h3>
          <p className="muted small">
            Write it like a message to a friend. The AI fills in the form below for you.
          </p>
          <textarea
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. I'm vegetarian and want a relaxed trip with beaches and old churches. I must see Dudhsagar falls. No water sports or nightclubs. A cheap homestay is fine."
          />
          <Button type="button" onClick={handleFillFromText} disabled={filling || description.trim().length < 10}>
            {filling ? "Reading your description..." : "✨ Fill in the form for me"}
          </Button>
        </Card>

        <Message type="success" text={fillMessage} />

        <form className="card" onSubmit={handleSave}>
          <h3>Your answers</h3>
          <p className="muted small">Fill these in yourself, or let the AI fill them in above. Then click Save.</p>

          <label>What are you interested in? (pick any)</label>
          <div className="chip-list">
            {interestOptions.map((interest) => (
              <button
                type="button"
                key={interest}
                className={interests.includes(interest) ? "chip selected" : "chip"}
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </button>
            ))}
          </div>

          <label>Not in the list? Type your own interests (separate with commas)</label>
          <input
            value={otherInterests}
            onChange={(e) => setOtherInterests(e.target.value)}
            placeholder="e.g. scuba diving, street art, live music"
          />

          <label>How busy should each day be?</label>
          <div className="chip-list">
            {paceOptions.map((option) => (
              <button
                type="button"
                key={option}
                className={pace === option ? "chip selected" : "chip"}
                onClick={() => setPace(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <label>What do you eat?</label>
          <div className="chip-list">
            {foodOptions.map((option) => (
              <button
                type="button"
                key={option}
                className={foodPreference === option ? "chip selected" : "chip"}
                onClick={() => setFoodPreference(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <label>Where would you like to stay? – budget</label>
          <div className="chip-list">
            {stayBudgets.map((option) => (
              <button
                type="button"
                key={option}
                className={stayBudget === option ? "chip selected" : "chip"}
                onClick={() => setStayBudget(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <label>Where would you like to stay? – type of place</label>
          <div className="chip-list">
            {stayTypes.map((option) => (
              <button
                type="button"
                key={option}
                className={stayType === option ? "chip selected" : "chip"}
                onClick={() => setStayType(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <p className="muted small">The AI suggests where the group should stay. It does not book anything.</p>

          <label>My budget contribution ({currency})</label>
          <input
            type="number"
            min="0"
            value={budgetContribution}
            onChange={(e) => setBudgetContribution(e.target.value)}
          />

          <label>Must do – places or activities you really want (separate with commas)</label>
          <input value={mustDo} onChange={(e) => setMustDo(e.target.value)} />

          <label>Deal-breakers – things to avoid (separate with commas)</label>
          <input value={dealBreakers} onChange={(e) => setDealBreakers(e.target.value)} />

          <label>Anything else? Describe your ideal trip in your own words</label>
          <textarea rows="3" value={freeTextNotes} onChange={(e) => setFreeTextNotes(e.target.value)} />

          <Button type="submit">Save preferences</Button>

          <Message type="success" text={message} />
          <Message type="error" text={error} />
        </form>
      </section>
    </div>
  );
}

export default PreferencesPage;
