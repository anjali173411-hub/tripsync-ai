// Group Decisions: things the AI found the group disagrees on (FR-5.3 to FR-5.5).
// Each conflict has 2-3 options. Members vote; the organiser can also decide directly.
// An option is chosen automatically when more than half of the group votes for it.

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Scale, CheckCircle2, Clock, Users } from "lucide-react";
import api, { getErrorMessage, getCurrentUser, formatMoney } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";
import Card from "../components/ui/Card.jsx";
import Message from "../components/ui/Message.jsx";
import Loading from "../components/ui/Loading.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

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

  // How many decisions are still open
  function countOpen() {
    let count = 0;
    for (let i = 0; i < conflicts.length; i++) {
      if (!conflicts[i].resolved) {
        count = count + 1;
      }
    }
    return count;
  }



  if (!trip) {
    if (error) {
      return <Message type="error" text={error} />;
    }
    return <Loading text="Loading..." />;
  }

  const isOrganiser = trip.organiser._id === user.id;

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <PageHeader title="Group Decisions">
          When members want different things, the AI suggests compromises here. Vote for the one you prefer.
          An option is chosen once more than half of the group votes for it.
        </PageHeader>

        <Message type="error" text={error} />

        {/* No itinerary yet */}
        {!itinerary && (
          <Card className="center">
            <p>Nothing to decide yet. The AI finds conflicts when the itinerary is generated.</p>
            <Link to={"/trips/" + tripId + "/itinerary"}>Go to Itinerary</Link>
          </Card>
        )}

        {/* Itinerary exists but no conflicts */}
        {itinerary && conflicts.length === 0 && (
          <Card className="center">
            <p>🎉 No conflicts – the AI found a plan that suits everyone.</p>
          </Card>
        )}

        {/* Small summary: how many decisions are open, how many are done */}
        {itinerary && conflicts.length > 0 && (
          <div className="decision-summary">
            <span className="decision-count open"><Clock size={16} /> {countOpen()} to decide</span>
            <span className="decision-count done"><CheckCircle2 size={16} /> {conflicts.length - countOpen()} decided</span>
          </div>
        )}

        {/* One card for each conflict */}
        {itinerary && conflicts.map((conflict) => {
          const myVote = getMyVote(conflict);
          const canVote = !conflict.resolved && itinerary.status !== "finalised";
          const letters = ["A", "B", "C", "D"];

          // The coloured label at the top of the card
          let statusText = "Decided";
          let statusClass = "decision-status decided";
          if (canVote && myVote === -1) {
            statusText = "Needs your vote";
            statusClass = "decision-status needs-vote";
          } else if (canVote) {
            statusText = "Waiting for others";
            statusClass = "decision-status waiting";
          }

          return (
            <div key={conflict._id} className={conflict.resolved ? "decision-card resolved" : "decision-card"}>
              {/* Top: label, title, who it affects */}
              <div className="decision-head">
                <span className={statusClass}>{statusText}</span>

                <h2 className="decision-title">
                  <span className="decision-icon"><Scale size={20} /></span>
                  {conflict.conflictDescription}
                </h2>

                {conflict.affectedMembers.length > 0 && (
                  <div className="decision-people">
                    <Users size={15} />
                    {conflict.affectedMembers.map((name) => (
                      <span key={name} className="person-chip">
                        <span className="person-letter">{name.charAt(0).toUpperCase()}</span>
                        {name}
                      </span>
                    ))}
                  </div>
                )}

                <p className="decision-why">{conflict.reasoning}</p>
              </div>

              {/* The options, side by side (SRS 4.1) */}
              <div className="options">
                {conflict.options.map((option, index) => {
                  const isChosen = conflict.resolved && conflict.chosenOption === index;
                  const isMine = myVote === index;

                  // How full the vote bar is (0 to 100)
                  let votePercent = 0;
                  if (trip.members.length > 0) {
                    votePercent = (option.voteCount / trip.members.length) * 100;
                  }

                  let optionClass = "option";
                  if (isChosen) {
                    optionClass = "option chosen";
                  } else if (isMine) {
                    optionClass = "option mine";
                  }

                  return (
                    <div key={option._id} className={optionClass}>
                      <div className="option-top">
                        <span className="option-letter">{letters[index]}</span>
                        <span className={option.extraCost > 0 ? "cost-badge" : "cost-badge free"}>
                          {option.extraCost > 0 ? "+" + formatMoney(option.extraCost, currency) : "No extra cost"}
                        </span>
                      </div>

                      <p className="option-text">{option.description}</p>

                      {/* Vote bar */}
                      <div className="vote-bar">
                        <div className="vote-bar-fill" style={{ width: votePercent + "%" }} />
                      </div>
                      <p className="vote-count">{option.voteCount} of {trip.members.length} votes</p>

                      {isChosen && <p className="chosen-label"><CheckCircle2 size={16} /> Group's choice</p>}

                      {canVote && (
                        <button
                          className={isMine ? "vote-button voted" : "vote-button"}
                          onClick={() => handleVote(conflict._id, index)}
                        >
                          {isMine ? "✓ Your vote" : "Vote " + letters[index]}
                        </button>
                      )}

                      {canVote && isOrganiser && (
                        <button className="link-button" onClick={() => handleDecide(conflict._id, index)}>
                          Decide this for everyone
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
