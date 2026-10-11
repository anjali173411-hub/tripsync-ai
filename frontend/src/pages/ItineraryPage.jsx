// The AI itinerary, day by day.
//
// How it works:
//   1. No itinerary yet  -> organiser clicks "Generate with AI" (FR-4.1)
//   2. Itinerary ready   -> everyone sees the days; click an activity to open it (SRS 4.1)
//      The organiser can edit, move or remove activities (FR-4.4),
//      plan one day again (FR-4.3) or the whole trip again.
//      Group trips vote on conflicts on the Group Decisions page.
//   3. Nothing left to decide -> organiser clicks "Finalise" (FR-5.7)

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Sparkles, RefreshCw, ArrowUp, ArrowDown, Pencil, Trash, BedDouble } from "lucide-react";
import api, { getErrorMessage, getCurrentUser, formatDate, formatMoney, travelModeText } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Message from "../components/ui/Message.jsx";
import Loading from "../components/ui/Loading.jsx";

function ItineraryPage() {
  const { tripId } = useParams();
  const user = getCurrentUser();

  const [trip, setTrip] = useState(null);
  const [currency, setCurrency] = useState("");
  const [itinerary, setItinerary] = useState(null);    // stays null until the AI has made one
  const [conflicts, setConflicts] = useState([]);      // group decisions (from ConflictVote)
  const [membersNotInPlan, setMembersNotInPlan] = useState([]); // joined but no preferences yet
  const [selectedDay, setSelectedDay] = useState(0);   // which day tab is open (0 = Day 1)
  const [weatherDays, setWeatherDays] = useState([]);  // weather for each trip day (may stay empty)

  const [openActivityId, setOpenActivityId] = useState(""); // which activity card is expanded

  // Editing one activity
  const [editingId, setEditingId] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCost, setEditCost] = useState("");

  // Asking the AI again
  const [instructions, setInstructions] = useState("");       // for the whole trip
  const [dayInstructions, setDayInstructions] = useState(""); // for one day
  const [aiWorking, setAiWorking] = useState("");             // "", "trip" or "day"

  const [error, setError] = useState("");

  // Runs when the page opens
  useEffect(() => {
    loadPage();
  }, [tripId]);

  async function loadPage() {
    loadWeather();

    try {
      const tripResponse = await api.get("/trips/" + tripId);
      setTrip(tripResponse.data.trip);

      const optionsResponse = await api.get("/options");
      setCurrency(optionsResponse.data.currency);
    } catch (err) {
      setError(getErrorMessage(err));
      return;
    }

    try {
      const itineraryResponse = await api.get("/trips/" + tripId + "/itinerary");
      setItinerary(itineraryResponse.data.itinerary);
      setConflicts(itineraryResponse.data.conflicts);
      setMembersNotInPlan(itineraryResponse.data.membersNotInPlan);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setItinerary(null); // not generated yet, which is fine
      } else {
        setError(getErrorMessage(err));
      }
    }
  }

  // Weather is extra information: if it fails, the page simply shows no weather
  async function loadWeather() {
    try {
      const response = await api.get("/trips/" + tripId + "/weather");
      setWeatherDays(response.data.days);
    } catch (err) {
      setWeatherDays([]);
    }
  }

  // Finds the weather for one itinerary day (or null if we don't have it)
  function getWeatherForDay(dayDate) {
    const dateText = new Date(dayDate).toISOString().substring(0, 10);

    for (let i = 0; i < weatherDays.length; i++) {
      if (weatherDays[i].date === dateText) {
        return weatherDays[i];
      }
    }

    return null;
  }

  // ---------------- Asking the AI ----------------

  // Organiser plans the whole trip (FR-4.1) or plans it again (FR-4.3)
  async function handleGenerate() {
    setError("");
    setAiWorking("trip");

    try {
      const response = await api.post("/trips/" + tripId + "/generate", {
        instructions: instructions
      });
      setItinerary(response.data.itinerary);
      setConflicts(response.data.conflicts);
      setSelectedDay(0);
      setInstructions("");
    } catch (err) {
      // If the AI failed, the backend saved nothing, so the old itinerary is still there
      setError(getErrorMessage(err));
    }

    setAiWorking("");
  }

  // Organiser asks the AI for a cheaper version of the whole trip
  async function handleMakeCheaper(totalCost) {
    const sure = window.confirm(
      "The AI will make a new, cheaper plan for the whole trip. Group decisions will start over. Continue?"
    );
    if (!sure) {
      return;
    }

    setError("");
    setAiWorking("trip");

    try {
      const response = await api.post("/trips/" + tripId + "/generate", {
        instructions:
          "The current plan costs about " + totalCost + " " + currency + " for the whole group, " +
          "but the budget is " + trip.budget + " " + currency + ". Make a cheaper plan that fits the budget."
      });
      setItinerary(response.data.itinerary);
      setConflicts(response.data.conflicts);
      setSelectedDay(0);
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setAiWorking("");
  }

  // Organiser plans only the selected day again (FR-4.3)
  async function handleRegenerateDay(dayNumber) {
    setError("");
    setAiWorking("day");

    try {
      const response = await api.post("/trips/" + tripId + "/days/" + dayNumber + "/regenerate", {
        instructions: dayInstructions
      });
      setItinerary(response.data.itinerary);
      setDayInstructions("");
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setAiWorking("");
  }

  // ---------------- Changing activities by hand (FR-4.4) ----------------

  // Click an activity to open or close it
  function toggleActivity(activityId) {
    if (openActivityId === activityId) {
      setOpenActivityId("");
    } else {
      setOpenActivityId(activityId);
    }
  }

  // Fill the edit form with the activity's current values
  function startEditing(activity) {
    setEditingId(activity._id);
    setEditTime(activity.time);
    setEditName(activity.name);
    setEditDescription(activity.description);
    setEditCost(activity.estimatedCost);
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await api.put("/trips/" + tripId + "/activities/" + editingId, {
        time: editTime,
        name: editName,
        description: editDescription,
        estimatedCost: Number(editCost)
      });
      setItinerary(response.data.itinerary);
      setEditingId("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Move an activity earlier ("up") or later ("down") in the day
  async function handleMove(activityId, direction) {
    setError("");

    try {
      const response = await api.post("/trips/" + tripId + "/activities/" + activityId + "/move", {
        direction: direction
      });
      setItinerary(response.data.itinerary);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleRemove(activity) {
    const sure = window.confirm("Remove \"" + activity.name + "\" from the itinerary?");
    if (!sure) {
      return;
    }

    try {
      const response = await api.delete("/trips/" + tripId + "/activities/" + activity._id);
      setItinerary(response.data.itinerary);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Organiser locks the itinerary (FR-5.7)
  async function handleFinalise() {
    const sure = window.confirm("Finalise the itinerary? It can't be changed afterwards.");
    if (!sure) {
      return;
    }

    try {
      await api.post("/trips/" + tripId + "/finalise");
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // ---------------- Small calculations ----------------

  // Adds up the cost of a list of activities
  function getTotalCost(activities) {
    let total = 0;
    for (let i = 0; i < activities.length; i++) {
      total = total + activities[i].estimatedCost;
    }
    return total;
  }

  // Which part of the day an activity is in, from its time like "13:30"
  function getPartOfDay(time) {
    const hour = parseInt(String(time).substring(0, 2), 10);

    if (hour < 12) {
      return "Morning";
    }
    if (hour < 17) {
      return "Afternoon";
    }
    return "Evening"; // also used if the time can not be read
  }

  // A small picture for each kind of activity
  function getActivityIcon(activity) {
    if (activity.category === "travel") {
      if (trip.travelMode) {
        return travelModeText(trip.travelMode).split(" ")[0]; // the train, bus or car emoji
      }
      return "🧭";
    }
    if (activity.category === "food") {
      return "🍽️";
    }
    if (activity.category === "stay") {
      return "🏨";
    }
    return "📍";
  }

  // Counts the conflicts that are not decided yet
  function countOpenDecisions() {
    let count = 0;
    for (let i = 0; i < conflicts.length; i++) {
      if (!conflicts[i].resolved) {
        count = count + 1;
      }
    }
    return count;
  }

  // ---------------- What to show ----------------

  // 1. Still loading the trip
  if (!trip) {
    if (error) {
      return <Message type="error" text={error} />;
    }
    return <Loading text="Loading itinerary..." />;
  }

  const isOrganiser = trip.organiser._id === user.id;

  // 2. The AI is working: show a loading message (SRS 5.1)
  if (aiWorking) {
    return (
      <div className="trip-layout">
        <Sidebar trip={trip} />
        <section className="trip-content">
          <Card className="center">
            <div className="spinner" />
            <h2>{aiWorking === "day" ? "The AI is planning this day again..." : "The AI is planning your trip..."}</h2>
            <p className="muted">This can take up to a minute.</p>
          </Card>
        </section>
      </div>
    );
  }

  // 3. No itinerary yet
  if (!itinerary) {
    return (
      <div className="trip-layout">
        <Sidebar trip={trip} />
        <section className="trip-content">
          <h1>Itinerary</h1>
          <Card className="center">
            <div className="empty-icon"><Sparkles size={30} /></div>
            <h2>No itinerary yet</h2>

            {isOrganiser && (
              <div>
                <p className="muted">Make sure everyone has saved their preferences, then let the AI plan the trip.</p>
                <Button onClick={handleGenerate}><Sparkles size={18} /> Generate with AI</Button>
              </div>
            )}

            {!isOrganiser && (
              <p className="muted">Save your preferences. The organiser will generate the itinerary once everyone is ready.</p>
            )}

            <Message type="error" text={error} />
          </Card>
        </section>
      </div>
    );
  }

  // 4. The itinerary exists: work out a few values, then show it
  const isFinalised = itinerary.status === "finalised";
  const canEdit = isOrganiser && !isFinalised && trip.status === "planning";
  const openDecisions = countOpenDecisions();

  // Activity costs from the AI are PER PERSON.
  // The trip budget is for EVERYONE together, so multiply by the number of people.
  let costPerPerson = 0;
  for (let i = 0; i < itinerary.days.length; i++) {
    costPerPerson = costPerPerson + getTotalCost(itinerary.days[i].activities);
  }

  const numberOfPeople = trip.members.length;

  // The stay is priced per night for the whole group. A 3-day trip has 2 nights.
  let nights = itinerary.days.length - 1;
  if (nights < 0) {
    nights = 0;
  }
  let stayCost = 0;
  if (itinerary.stay && itinerary.stay.area) {
    stayCost = itinerary.stay.costPerNight * nights;
  }

  const costForEveryone = costPerPerson * numberOfPeople + stayCost;
  const overBudget = costForEveryone > trip.budget;

  const day = itinerary.days[selectedDay];
  const dayWeather = getWeatherForDay(day.date);

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <h1>Itinerary</h1>

        <Message type="error" text={error} />
        {isFinalised && <p className="success">✅ This itinerary is finalised.</p>}

        {/* People who joined after the plan was made, and aren't in it yet */}
        {!isFinalised && membersNotInPlan.length > 0 && (
          <Card className="notice">
            👥 Not in this plan yet: <strong>{membersNotInPlan.join(", ")}</strong> (no preferences saved).
            {" "}They should fill in{" "}
            <Link to={"/trips/" + tripId + "/preferences"}>My Preferences</Link>.
            {isOrganiser && " Then click \"Plan whole trip again\" below so the plan includes them."}
          </Card>
        )}

        {openDecisions > 0 && (
          <Card className="notice">
            ⚖️ The AI found {openDecisions} thing(s) the group needs to decide.{" "}
            <Link to={"/trips/" + tripId + "/consensus"}>Go to Group Decisions →</Link>
          </Card>
        )}

        {/* Cost summary: per person, for everyone, and the total trip budget */}
        <Card className="cost-summary">
          <div>
            <span className="muted small">Activities per person</span>
            <strong>{formatMoney(costPerPerson, currency)}</strong>
          </div>
          <div>
            <span className="muted small">Stay ({nights} night{nights === 1 ? "" : "s"}, whole group)</span>
            <strong>{formatMoney(stayCost, currency)}</strong>
          </div>
          <div>
            <span className="muted small">Total for all {numberOfPeople} {numberOfPeople === 1 ? "person" : "people"}</span>
            <strong>{formatMoney(costForEveryone, currency)}</strong>
          </div>
          <div>
            <span className="muted small">Total trip budget</span>
            <strong>{formatMoney(trip.budget, currency)}</strong>
          </div>
        </Card>

        {overBudget && (
          <Card className="over-budget">
            <p className="error">
              This plan costs about {formatMoney(costForEveryone, currency)}, which is{" "}
              {formatMoney(costForEveryone - trip.budget, currency)} more than the trip budget.
            </p>
            {canEdit && (
              <Button onClick={() => handleMakeCheaper(costForEveryone)}>
                💰 Make it cheaper with AI
              </Button>
            )}
            {!canEdit && !isFinalised && (
              <p className="muted small">The organiser can ask the AI for a cheaper plan.</p>
            )}
          </Card>
        )}

        {/* Where to stay: the AI's suggestion (not a booking) */}
        {itinerary.stay && itinerary.stay.area && (
          <Card className="stay-card">
            <div className="stay-icon"><BedDouble size={26} /></div>
            <div>
              <span className="muted small">Where to stay (suggestion, not a booking)</span>
              <h3>
                {itinerary.stay.placeType} in {itinerary.stay.area}
              </h3>
              <p className="small">
                <span className="tag">{itinerary.stay.budgetLevel}</span>
                About <strong>{formatMoney(itinerary.stay.costPerNight, currency)}</strong> per night for the whole group
              </p>
              <p className="muted small">{itinerary.stay.reason}</p>
              {trip.type === "group" && itinerary.stay.matchedMembers.length > 0 && (
                <span className="tag tag-match">Matches: {itinerary.stay.matchedMembers.join(", ")}</span>
              )}
            </div>
          </Card>
        )}

        {/* One tab button per day */}
        <div className="tabs">
          {itinerary.days.map((oneDay, index) => (
            <button
              key={oneDay._id}
              className={selectedDay === index ? "tab active" : "tab"}
              onClick={() => setSelectedDay(index)}
            >
              Day {oneDay.dayNumber}
            </button>
          ))}
        </div>

        <p className="muted">
          {formatDate(day.date)} · about {formatMoney(getTotalCost(day.activities), currency)} per person
          {dayWeather && (
            <span className="day-weather">
              {dayWeather.emoji} {dayWeather.label} · {dayWeather.maxTemp}° / {dayWeather.minTemp}°
            </span>
          )}
        </p>
        {day.activities.length === 0 && <p className="muted">No activities on this day.</p>}

        {/* The day as a timeline: Morning, Afternoon, Evening */}
        {["Morning", "Afternoon", "Evening"].map((part) => {
          // The activities that belong to this part of the day (keeping their position in the day)
          const items = [];
          for (let i = 0; i < day.activities.length; i++) {
            if (getPartOfDay(day.activities[i].time) === part) {
              items.push({ activity: day.activities[i], index: i });
            }
          }

          if (items.length === 0) {
            return null;
          }

          return (
            <div key={part} className="day-part">
              <h3 className="day-part-title">{part}</h3>

              {items.map((item) => {
                const activity = item.activity;
                const index = item.index;
                const isOpen = openActivityId === activity._id;
                const isEditing = editingId === activity._id;

                return (
                  <div key={activity._id} className={"timeline-item" + (activity.category === "travel" ? " travel" : "")}>
                    <div className="timeline-time">{activity.time}</div>

                    <div className="timeline-body">
                      <div className="row-between">
                        <h4>{getActivityIcon(activity)} {activity.name}</h4>
                        <span className="activity-cost">
                          {activity.estimatedCost > 0 ? formatMoney(activity.estimatedCost, currency) : "Free"}
                        </span>
                      </div>

                      <p className="muted">{activity.description}</p>

                      {/* FR-5.6: which members this activity was chosen for */}
                      {trip.type === "group" && activity.matchedMembers.length > 0 && (
                        <span className="tag tag-match">Matches: {activity.matchedMembers.join(", ")}</span>
                      )}

                      {/* Organiser only: small "Change" link that opens the edit buttons */}
                      {canEdit && !isEditing && (
                        <button className="link-button" onClick={() => toggleActivity(activity._id)}>
                          {isOpen ? "Close" : "Change"}
                        </button>
                      )}

                      {canEdit && isOpen && !isEditing && (
                        <div className="button-row activity-buttons">
                          <Button variant="outline" size="small" onClick={() => startEditing(activity)}>
                            <Pencil size={14} /> Edit
                          </Button>
                          <Button variant="outline" size="small"
                            onClick={() => handleMove(activity._id, "up")}
                            disabled={index === 0}
                          >
                            <ArrowUp size={14} /> Earlier
                          </Button>
                          <Button variant="outline" size="small"
                            onClick={() => handleMove(activity._id, "down")}
                            disabled={index === day.activities.length - 1}
                          >
                            <ArrowDown size={14} /> Later
                          </Button>
                          <Button variant="danger" size="small" onClick={() => handleRemove(activity)}>
                            <Trash size={14} /> Remove
                          </Button>
                        </div>
                      )}

                      {/* The edit form */}
                      {isEditing && (
                        <form onSubmit={handleSaveEdit}>
                          <div className="two-columns">
                            <div>
                              <label>Time</label>
                              <input value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                            </div>
                            <div>
                              <label>Cost per person ({currency})</label>
                              <input type="number" min="0" value={editCost} onChange={(e) => setEditCost(e.target.value)} required />
                            </div>
                          </div>

                          <label>Name</label>
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} required />

                          <label>Description</label>
                          <textarea rows="2" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />

                          <div className="button-row">
                            <Button type="submit">Save</Button>
                            <Button type="button" variant="outline" onClick={() => setEditingId("")}>Cancel</Button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Organiser: finalise (always visible) */}
        {canEdit && (
          <Card>
            <Button onClick={handleFinalise} disabled={openDecisions > 0}>Finalise itinerary</Button>
            {openDecisions > 0 && <p className="muted small">Resolve all open group decisions first.</p>}
            {openDecisions === 0 && <p className="muted small">Happy with the plan? Finalise it to lock it for everyone.</p>}
          </Card>
        )}

        {/* Organiser: asking the AI again, hidden until opened */}
        {canEdit && (
          <details className="card change-plan">
            <summary>Change the plan with AI</summary>

            <h3>Plan Day {day.dayNumber} again</h3>
            <p className="muted small">The AI re-plans only this day. The other days stay the same.</p>
            <input
              value={dayInstructions}
              onChange={(e) => setDayInstructions(e.target.value)}
              placeholder="e.g. make this day less physically demanding"
            />
            <Button variant="outline" onClick={() => handleRegenerateDay(day.dayNumber)}>
              <RefreshCw size={16} /> Plan Day {day.dayNumber} again
            </Button>

            <hr />

            <h3>Plan the whole trip again</h3>
            <p className="muted small">The AI makes a completely new plan. Group decisions start over.</p>
            <input
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="What should the AI change?"
            />
            <Button variant="outline" onClick={handleGenerate}><RefreshCw size={16} /> Plan whole trip again</Button>
          </details>
        )}
      </section>
    </div>
  );
}

export default ItineraryPage;
