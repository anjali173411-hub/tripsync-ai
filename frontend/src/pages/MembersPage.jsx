import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import api, { getErrorMessage, getCurrentUser } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";

function MembersPage() {
  const { tripId } = useParams();
  const user = getCurrentUser();

  const [trip, setTrip] = useState(null);
  const [submittedUserIds, setSubmittedUserIds] = useState([]);
  const [email, setEmail] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadPage();
  }, [tripId]);

  async function loadPage() {
    try {
      const tripResponse = await api.get("/trips/" + tripId);
      const loadedTrip = tripResponse.data.trip;
      setTrip(loadedTrip);

      if (loadedTrip.organiser._id === user.id) {
        const prefResponse = await api.get("/trips/" + tripId + "/preferences");
        const ids = [];
        for (let i = 0; i < prefResponse.data.preferences.length; i++) {
          ids.push(prefResponse.data.preferences[i].user._id);
        }
        setSubmittedUserIds(ids);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function sendInvite(emailToInvite) {
    if (inviting) {
      return;
    }
    setInviting(true);
    setError("");
    try {
      const response = await api.post("/trips/" + tripId + "/members", { email: emailToInvite });
      notifications.show({ message: response.data.message, color: "green" });
      setEmail("");
      await loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setInviting(false);
  }

  async function handleSearch(event) {
    event.preventDefault();
    try {
      const response = await api.get("/profile/search?q=" + encodeURIComponent(searchText));
      setSearchResults(response.data.users);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleCancelInvite(invitedEmail) {
    if (!window.confirm("Cancel the invitation to " + invitedEmail + "?")) {
      return;
    }
    try {
      await api.delete("/trips/" + tripId + "/invitations", { data: { email: invitedEmail } });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleRemove(member) {
    if (!window.confirm("Remove " + member.name + "? Their preferences and votes will be deleted.")) {
      return;
    }
    try {
      await api.delete("/trips/" + tripId + "/members/" + member._id);
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (!trip) {
    if (error) {
      return <p className="error-box">{error}</p>;
    }
    return <div className="center-box"><Loader /></div>;
  }

  const isOrganiser = trip.organiser._id === user.id;
  const canChangeMembers = isOrganiser && trip.status === "planning";

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <h1>Members</h1>

        {error && <p className="error-box">{error}</p>}

        <div className="box">
          <h3>In this trip ({trip.members.length})</h3>

          {trip.members.map((member) => (
            <div key={member._id} className="row">
              <div>
                <b>{member.name}</b>
                {member._id === trip.organiser._id && <span className="tag">Organiser</span>}
                <p className="muted small">{member.email}</p>
              </div>

              <div>
                {isOrganiser && submittedUserIds.includes(member._id) && <span className="tag green">Preferences done</span>}
                {isOrganiser && !submittedUserIds.includes(member._id) && <span className="tag orange">No preferences yet</span>}
                {canChangeMembers && member._id !== trip.organiser._id && (
                  <button className="small-button danger" onClick={() => handleRemove(member)}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {trip.invitedEmails.length > 0 && (
          <div className="box">
            <h3>Waiting for reply</h3>
            {trip.invitedEmails.map((invitedEmail) => (
              <div key={invitedEmail} className="row">
                <span>{invitedEmail} <span className="tag orange">Invited</span></span>
                {canChangeMembers && (
                  <button className="small-button" onClick={() => handleCancelInvite(invitedEmail)}>Cancel invite</button>
                )}
              </div>
            ))}
          </div>
        )}

        {canChangeMembers && (
          <div className="box">
            <h3>Invite people</h3>

            <label>Invite by email (works even if they don't have an account yet)</label>
            <div className="input-row">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" />
              <button onClick={() => sendInvite(email)} disabled={!email || inviting}>
                {inviting ? "Sending..." : "Send invite"}
              </button>
            </div>

            <label>Or search people already on TripSync AI</label>
            <form className="input-row" onSubmit={handleSearch}>
              <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Name or email" minLength={2} required />
              <button type="submit">Search</button>
            </form>

            {searchResults.map((person) => (
              <div key={person._id} className="row">
                <span>{person.name} <span className="muted small">{person.email}</span></span>
                <button className="small-button" onClick={() => sendInvite(person.email)} disabled={inviting}>Invite</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default MembersPage;
