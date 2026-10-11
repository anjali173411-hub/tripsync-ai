// Group Decisions: things the AI found the group disagrees on (FR-5.3 to FR-5.5).
// Each conflict has 2-3 options. Members vote; the organiser can also decide directly.
// An option is chosen automatically when more than half of the group votes for it.

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader } from "@mantine/core";
import api, { getErrorMessage, getCurrentUser, formatMoney } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";

function ConsensusPage() {
  const { tripId } = useParams();
  const user = getCurrentUser();

  const [trip, setTrip] = useState(null);
  const [currency, setCurrency] = useState("");
  const [itinerary, setItinerary] = useState(null);
  const [conflicts, setConflicts] = useState([]);
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

      const itineraryResponse = await api.get("/trips/" + tripId + "/itinerary");
      setItinerary(itineraryResponse.data.itinerary);
      setConflicts(itineraryResponse.data.conflicts);
    } catch (err) {
      // 404 just means there is no itinerary yet
      if (!err.response || err.response.status !== 404) {
        setError(getErrorMessage(err));
      }
    }
  }

  // A member votes for one option
  async function handleVote(conflictId, optionIndex) {
    try {
      await api.post("/trips/" + tripId + "/conflicts/" + conflictId + "/vote", { optionIndex: optionIndex });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // The organiser picks an option for everyone
  async function handleDecide(conflictId, optionIndex) {
    if (!window.confirm("Choose this option for the whole group?")) {
      return;
    }
    try {
      await api.post("/trips/" + tripId + "/conflicts/" + conflictId + "/resolve", { optionIndex: optionIndex });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Which option I voted for (-1 if I haven't voted)
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
      return <p className="error-box">{error}</p>;
    }
    return <div className="center-box"><Loader /></div>;
  }

  const isOrganiser = trip.organiser._id === user.id;

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <h1>Group Decisions</h1>
        <p className="muted">Vote for the option you prefer. An option wins when more than half of the group votes for it.</p>

        {error && <p className="error-box">{error}</p>}

        {!itinerary && (
          <p className="box">Nothing to decide yet. <Link to={"/trips/" + tripId + "/itinerary"}>Generate the itinerary first.</Link></p>
        )}

        {itinerary && conflicts.length === 0 && (
          <p className="box">No conflicts. The AI found a plan that suits everyone.</p>
        )}

        {/* One box per decision */}
        {conflicts.map((conflict) => {
          const myVote = getMyVote(conflict);
          const canVote = !conflict.resolved && itinerary.status !== "finalised";

          return (
            <div key={conflict._id} className="box">
              {conflict.resolved && <span className="tag green">Decided</span>}
              {!conflict.resolved && myVote === -1 && <span className="tag orange">Needs your vote</span>}
              <h3>{conflict.conflictDescription}</h3>
              <p className="muted small">{conflict.reasoning}</p>

              {conflict.options.map((option, index) => (
                <div key={option._id} className={conflict.chosenOption === index ? "option chosen" : "option"}>
                  <div>
                    <b>{option.description}</b>
                    <p className="muted small">
                      Extra cost: {option.extraCost > 0 ? formatMoney(option.extraCost, currency) : "none"} ·
                      Votes: {option.voteCount} of {trip.members.length}
                    </p>
                    {conflict.chosenOption === index && <span className="tag green">Group's choice</span>}
                  </div>

                  {canVote && (
                    <div className="button-row">
                      <button className={myVote === index ? "small-button" : "small-button outline-button"} onClick={() => handleVote(conflict._id, index)}>
                        {myVote === index ? "Your vote" : "Vote"}
                      </button>
                      {isOrganiser && (
                        <button className="small-button outline-button" onClick={() => handleDecide(conflict._id, index)}>Decide for everyone</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default ConsensusPage;
