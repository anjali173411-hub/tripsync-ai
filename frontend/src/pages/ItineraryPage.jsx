import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader, Modal, TextInput, NumberInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Pencil, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import api, { getErrorMessage, getCurrentUser, formatDate, formatMoney } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";

function ItineraryPage() {
  const { tripId } = useParams();
  const user = getCurrentUser();

  const [trip, setTrip] = useState(null);
  const [currency, setCurrency] = useState("");
  const [itinerary, setItinerary] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [membersNotInPlan, setMembersNotInPlan] = useState([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [aiWorking, setAiWorking] = useState(false);
  const [error, setError] = useState("");

  const [instructions, setInstructions] = useState("");
  const [dayInstructions, setDayInstructions] = useState("");

  const [editingId, setEditingId] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCost, setEditCost] = useState("");

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
      return;
    }

    try {
      const response = await api.get("/trips/" + tripId + "/itinerary");
      setItinerary(response.data.itinerary);
      setConflicts(response.data.conflicts);
      setMembersNotInPlan(response.data.membersNotInPlan);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setItinerary(null);
      } else {
        setError(getErrorMessage(err));
      }
    }
  }

  async function planTrip(instructionsText) {
    setError("");
    setAiWorking(true);

    try {
      const response = await api.post("/trips/" + tripId + "/generate", { instructions: instructionsText });
      setItinerary(response.data.itinerary);
      setConflicts(response.data.conflicts);
      setSelectedDay(0);
      setInstructions("");
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setAiWorking(false);
  }

  function handleMakeCheaper(totalCost) {
    if (!window.confirm("The AI will make a new, cheaper plan. Group decisions will start over. Continue?")) {
      return;
    }
    planTrip("The plan costs about " + totalCost + " " + currency + " but the budget is " +
      trip.budget + " " + currency + ". Make a cheaper plan that fits the budget.");
  }

  async function handleRegenerateDay(dayNumber) {
    setError("");
    setAiWorking(true);

    try {
      const response = await api.post("/trips/" + tripId + "/days/" + dayNumber + "/regenerate", {
        instructions: dayInstructions
      });
      setItinerary(response.data.itinerary);
      setDayInstructions("");
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setAiWorking(false);
  }

  function startEditing(activity) {
    setEditingId(activity._id);
    setEditTime(activity.time);
    setEditName(activity.name);
    setEditDescription(activity.description);
    setEditCost(activity.estimatedCost);
  }

  async function handleSaveEdit(event) {
    event.preventDefault();

    try {
      const response = await api.put("/trips/" + tripId + "/activities/" + editingId, {
        time: editTime,
        name: editName,
        description: editDescription,
        estimatedCost: Number(editCost)
      });
      setItinerary(response.data.itinerary);
      setEditingId("");
      notifications.show({ message: "Activity saved", color: "green" });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleMove(activityId, direction) {
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
    if (!window.confirm("Remove \"" + activity.name + "\" from the itinerary?")) {
      return;
    }

    try {
      const response = await api.delete("/trips/" + tripId + "/activities/" + activity._id);
      setItinerary(response.data.itinerary);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleFinalise() {
    if (!window.confirm("Finalise the itinerary? It will be locked for everyone.")) {
      return;
    }

    try {
      await api.post("/trips/" + tripId + "/finalise");
      notifications.show({ message: "Plan finalised. Have a great trip!", color: "green" });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function getTotalCost(activities) {
    let total = 0;
    for (let i = 0; i < activities.length; i++) {
      total = total + activities[i].estimatedCost;
    }
    return total;
  }

  function countOpenDecisions() {
    let count = 0;
    for (let i = 0; i < conflicts.length; i++) {
      if (!conflicts[i].resolved) {
        count = count + 1;
      }
    }
    return count;
  }

  function getNotMatched(matchedMembers) {
    if (trip.type !== "group" || matchedMembers.length === 0) {
      return [];
    }

    const notMatched = [];
    for (let i = 0; i < trip.members.length; i++) {
      const name = trip.members[i].name;
      if (!matchedMembers.includes(name) && !membersNotInPlan.includes(name)) {
        notMatched.push(name);
      }
    }
    return notMatched;
  }

  if (!trip) {
    if (error) {
      return <p className="error-box">{error}</p>;
    }
    return <div className="center-box"><Loader /></div>;
  }

  const isOrganiser = trip.organiser._id === user.id;

  if (aiWorking) {
    return (
      <div className="trip-layout">
        <Sidebar trip={trip} />
        <section className="trip-content">
          <div className="box center-box">
            <Loader />
            <h2>The AI is planning your trip...</h2>
            <p className="muted">This can take up to a minute.</p>
          </div>
        </section>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="trip-layout">
        <Sidebar trip={trip} />
        <section className="trip-content">
          <h1>Itinerary</h1>
          <div className="box center-box">
            <h2>No itinerary yet</h2>
            {isOrganiser && (
              <div>
                <p className="muted">Make sure everyone has saved their preferences, then let the AI plan the trip.</p>
                <button onClick={() => planTrip("")}>Generate with AI</button>
              </div>
            )}
            {!isOrganiser && (
              <p className="muted">The organiser will generate the itinerary once everyone has saved their preferences.</p>
            )}
            {error && <p className="error-box">{error}</p>}
          </div>
        </section>
      </div>
    );
  }

  const isFinalised = itinerary.status === "finalised";
  const canEdit = isOrganiser && !isFinalised && trip.status === "planning";
  const openDecisions = countOpenDecisions();

  let activitiesCost = 0;
  for (let i = 0; i < itinerary.days.length; i++) {
    activitiesCost = activitiesCost + getTotalCost(itinerary.days[i].activities);
  }
  const nights = Math.max(itinerary.days.length - 1, 0);
  let stayCost = 0;
  if (itinerary.stay && itinerary.stay.area) {
    stayCost = itinerary.stay.costPerNight * nights;
  }
  const totalCost = activitiesCost * trip.members.length + stayCost;
  const overBudget = totalCost > trip.budget;

  const day = itinerary.days[selectedDay];

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <h1>Itinerary {isFinalised && <span className="tag green">Finalised</span>}</h1>

        {error && <p className="error-box">{error}</p>}

        {membersNotInPlan.length > 0 && !isFinalised && (
          <p className="warning-box">
            Not in this plan yet: <b>{membersNotInPlan.join(", ")}</b>. They need to save their preferences,
            then the organiser plans the trip again.
          </p>
        )}

        {openDecisions > 0 && (
          <p className="warning-box">
            {openDecisions} group decision(s) to make. <Link to={"/trips/" + tripId + "/consensus"}>Go to Group Decisions</Link>
          </p>
        )}

        <div className="box">
          <p>
            Plan cost for {trip.members.length} {trip.members.length === 1 ? "person" : "people"}:{" "}
            <b className={overBudget ? "red-text" : ""}>{formatMoney(totalCost, currency)}</b>
            {" "}of {formatMoney(trip.budget, currency)} budget
          </p>
          <p className="muted small">
            Activities {formatMoney(activitiesCost, currency)} per person + stay {formatMoney(stayCost, currency)} for {nights} night(s)
          </p>
          {overBudget && canEdit && (
            <button onClick={() => handleMakeCheaper(totalCost)}>Make it cheaper with AI</button>
          )}
        </div>

        {itinerary.stay && itinerary.stay.area && (
          <div className="box">
            <p className="label">Where to stay</p>
            <h3><span className="capitalize">{itinerary.stay.placeType}</span> in {itinerary.stay.area}</h3>
            <p>
              <span className="tag">{itinerary.stay.budgetLevel}</span>{" "}
              About {formatMoney(itinerary.stay.costPerNight, currency)} per night for the whole group
            </p>
            <p className="muted small">{itinerary.stay.reason}</p>
            {getNotMatched(itinerary.stay.matchedMembers).length > 0 && (
              <span className="tag orange">Doesn't match: {getNotMatched(itinerary.stay.matchedMembers).join(", ")}</span>
            )}
          </div>
        )}

        {conflicts.length > 0 && openDecisions < conflicts.length && (
          <div className="box">
            <p className="label">Group decisions</p>
            {conflicts.map((conflict) => {
              if (!conflict.resolved) {
                return null;
              }
              const chosen = conflict.options[conflict.chosenOption];
              return (
                <div key={conflict._id} className="option chosen">
                  <div>
                    <b>{conflict.conflictDescription}</b>
                    <p className="small">
                      <span className="tag green">Group's choice</span> {chosen ? chosen.description : ""}
                    </p>
                    {chosen && chosen.extraCost > 0 && (
                      <p className="muted small">Extra cost: {formatMoney(chosen.extraCost, currency)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="day-tabs">
          {itinerary.days.map((oneDay, index) => (
            <button
              key={oneDay._id}
              className={index === selectedDay ? "day-tab active" : "day-tab"}
              onClick={() => setSelectedDay(index)}
            >
              Day {oneDay.dayNumber}
            </button>
          ))}
        </div>

        <div className="box">
          <h3>Day {day.dayNumber} · {formatDate(day.date)}</h3>
          <p className="muted small">About {formatMoney(getTotalCost(day.activities), currency)} per person</p>

          {day.activities.length === 0 && <p className="muted">No activities on this day.</p>}

          {day.activities.map((activity, index) => (
            <div key={activity._id} className="activity">
              <span className="activity-time">{activity.time}</span>

              <div className="activity-info">
                <b>{activity.name}</b>
                <p className="muted small">{activity.description}</p>
                {getNotMatched(activity.matchedMembers).length > 0 && (
                  <span className="tag orange">Doesn't match: {getNotMatched(activity.matchedMembers).join(", ")}</span>
                )}

              </div>

              <div className="activity-right">
                <span className="activity-cost">
                  {activity.estimatedCost > 0 ? formatMoney(activity.estimatedCost, currency) : "Free"}
                </span>

                {canEdit && (
                  <div className="activity-icons">
                    <button className="icon-btn" title="Edit" onClick={() => startEditing(activity)}>
                      <Pencil size={16} />
                    </button>
                    <button className="icon-btn" title="Move earlier" disabled={index === 0} onClick={() => handleMove(activity._id, "up")}>
                      <ArrowUp size={16} />
                    </button>
                    <button className="icon-btn" title="Move later" disabled={index === day.activities.length - 1} onClick={() => handleMove(activity._id, "down")}>
                      <ArrowDown size={16} />
                    </button>
                    <button className="icon-btn delete" title="Remove" onClick={() => handleRemove(activity)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Modal opened={editingId !== ""} onClose={() => setEditingId("")} title="Edit activity">
          <form onSubmit={handleSaveEdit} className="edit-form">
            <TextInput label="Time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
            <TextInput label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            <TextInput label="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            <NumberInput label={"Cost per person (" + currency + ")"} min={0} value={editCost} onChange={setEditCost} />
            <button type="submit">Save</button>
          </form>
        </Modal>

        {canEdit && (
          <div className="box">
            <h3>Change the plan with AI</h3>

            <p className="label">Plan Day {day.dayNumber} again</p>
            <div className="input-row">
              <input
                value={dayInstructions}
                onChange={(e) => setDayInstructions(e.target.value)}
                placeholder="What should change on this day?"
              />
              <button onClick={() => handleRegenerateDay(day.dayNumber)}>Plan day again</button>
            </div>

            <p className="label">Plan the whole trip again</p>
            <div className="input-row">
              <input
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="What should the AI change?"
              />
              <button onClick={() => planTrip(instructions)}>Plan trip again</button>
            </div>
          </div>
        )}

        {canEdit && (
          <div className="box">
            <h3>Happy with the plan?</h3>
            {openDecisions > 0 && <p className="muted">Resolve all group decisions first.</p>}
            <button onClick={handleFinalise} disabled={openDecisions > 0}>Finalise itinerary</button>
          </div>
        )}
      </section>
    </div>
  );
}

export default ItineraryPage;
