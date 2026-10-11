// Group Decisions: things the AI found the group disagrees on (FR-5.3 to FR-5.5).
// Each conflict has 2-3 options. Members vote; the organiser can also decide directly.
// An option is chosen automatically when more than half of the group votes for it.

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { getErrorMessage, getCurrentUser, formatMoney } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";
import NextStep from "../components/NextStep.jsx";

function ConsensusPage() {
  const { tripId } = useParams();
  const user = getCurrentUser();

  const [trip, setTrip] = useState(null);
  const [currency, setCurrency] = useState("");
  const [itinerary, setItinerary] = useState(null);
  const [conflicts, setConflicts] = useState([]); // one entry per conflict (ConflictVote, SRS 6.5)
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
      return;
    }

    // "Not found" just means the itinerary hasn't been generated yet
    try {
      const itineraryResponse = await api.get("/trips/" + tripId + "/itinerary");
      setItinerary(itineraryResponse.data.itinerary);
      setConflicts(itineraryResponse.data.conflicts);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setItinerary(null);
      } else {
        setError(getErrorMessage(err));
      }
    }
  }

  // A member votes for one option
  async function handleVote(conflictId, optionIndex) {
    setError("");

    try {
      await api.post("/trips/" + tripId + "/conflicts/" + conflictId + "/vote", {
        optionIndex: optionIndex
      });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // The organiser picks an option for everyone
  async function handleDecide(conflictId, optionIndex) {
    const sure = window.confirm("Choose this option for the whole group?");
    if (!sure) {
      return;
    }

    setError("");

    try {
      await api.post("/trips/" + tripId + "/conflicts/" + conflictId + "/resolve", {
        optionIndex: optionIndex
      });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function getMyVote(conflict) {
    for (let i = 0; i < conflict.votes.length; i++) {
      if (conflict.votes[i].user === user.id) {
        return conflict.votes[i].optionIndex;
      }
    }
    return -1;
  }



  if (!trip) {
    if (error) {
      return <p className="error">{error}</p>;
    }
    return <p>Loading...</p>;
  }

  const isOrganiser = trip.organiser._id === user.id;

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <NextStep tripId={tripId} refreshKey={JSON.stringify(conflicts)} />
        <h1>Group Decisions</h1>
        <p className="muted">
          When members want different things, the AI suggests compromises here. Vote for the one you prefer.
          An option is chosen once more than half of the group votes for it.
        </p>

        {error && <p className="error">{error}</p>}

        {/* No itinerary yet */}
        {!itinerary && (
          <div className="card center">
            <p>Nothing to decide yet. The AI finds conflicts when the itinerary is generated.</p>
            <Link to={"/trips/" + tripId + "/itinerary"}>Go to Itinerary</Link>
          </div>
        )}

        {/* Itinerary exists but no conflicts */}
        {itinerary && conflicts.length === 0 && (
          <div className="card center">
            <p>🎉 No conflicts – the AI found a plan that suits everyone.</p>
          </div>
        )}

        {/* One card for each conflict */}
        {itinerary && conflicts.map((conflict) => {
          const myVote = getMyVote(conflict);
          const canVote = !conflict.resolved && itinerary.status !== "finalised";

          return (
            <div key={conflict._id} className={conflict.resolved ? "card conflict resolved" : "card conflict"}>
              <h3>⚖️ {conflict.conflictDescription}</h3>

              {conflict.affectedMembers.length > 0 && (
                <p className="muted">Affects: {conflict.affectedMembers.join(", ")}</p>
              )}

              <p><strong>Why the AI flagged this:</strong> {conflict.reasoning}</p>

              {/* The options, side by side (SRS 4.1) */}
              <div className="options">
                {conflict.options.map((option, index) => {
                  const isChosen = conflict.resolved && conflict.chosenOption === index;

                  return (
                    <div key={option._id} className={isChosen ? "option chosen" : "option"}>
                      <p>{option.description}</p>

                      <p className="muted small">
                        Extra cost: {option.extraCost > 0 ? formatMoney(option.extraCost, currency) : "none"}
                      </p>

                      <p className="muted small">
                        Votes: {option.voteCount} of {trip.members.length}
                      </p>

                      {isChosen && <p className="success">✅ Chosen</p>}

                      {canVote && (
                        <button
                          className={myVote === index ? "btn-small" : "btn-small btn-outline"}
                          onClick={() => handleVote(conflict._id, index)}
                        >
                          {myVote === index ? "✓ Your vote" : "Vote for this"}
                        </button>
                      )}

                      {canVote && isOrganiser && (
                        <button className="btn-small btn-outline" onClick={() => handleDecide(conflict._id, index)}>
                          Decide as organiser
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default ConsensusPage;
