// Group members:
// - invite people by searching the app or by email (FR-2.3)
// - see who hasn't accepted their invitation yet (FR-2.4)
// - organiser removes members before the itinerary is finalised (FR-2.5)
// - organiser sees who has filled in preferences (FR-3.3)

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { getErrorMessage, getCurrentUser } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Message from "../components/ui/Message.jsx";
import Loading from "../components/ui/Loading.jsx";

function MembersPage() {
  const { tripId } = useParams();
  const user = getCurrentUser();

  const [trip, setTrip] = useState(null);
  const [submittedUserIds, setSubmittedUserIds] = useState([]); // ids of members who saved preferences

  // Search for people already on TripSync AI
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searched, setSearched] = useState(false);

  // Invite by typing an email
  const [email, setEmail] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Runs when the page opens
  useEffect(() => {
    loadPage();
  }, [tripId]);

  async function loadPage() {
    try {
      const tripResponse = await api.get("/trips/" + tripId);
      const loadedTrip = tripResponse.data.trip;
      setTrip(loadedTrip);

      // Only the organiser is allowed to see everyone's preferences
      if (loadedTrip.organiser._id === user.id) {
        const prefResponse = await api.get("/trips/" + tripId + "/preferences");
        const preferences = prefResponse.data.preferences;

        const ids = [];
        for (let i = 0; i < preferences.length; i++) {
          ids.push(preferences[i].user._id);
        }
        setSubmittedUserIds(ids);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Sends an invitation to one email address
  async function sendInvite(emailToInvite) {
    setMessage("");
    setError("");

    try {
      const response = await api.post("/trips/" + tripId + "/members", { email: emailToInvite });
      setMessage(response.data.message);
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Search people who already have an account
  async function handleSearch(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await api.get("/profile/search?q=" + encodeURIComponent(searchText));
      setSearchResults(response.data.users);
      setSearched(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Invite by the email typed in the box
  async function handleInviteByEmail(event) {
    event.preventDefault();
    await sendInvite(email);
    setEmail("");
  }

  // Organiser cancels an invitation that hasn't been answered
  async function handleCancelInvite(invitedEmail) {
    const sure = window.confirm("Cancel the invitation to " + invitedEmail + "?");
    if (!sure) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await api.delete("/trips/" + tripId + "/invitations", {
        data: { email: invitedEmail }
      });
      setMessage(response.data.message);
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Organiser removes a member
  async function handleRemove(member) {
    const sure = window.confirm(
      "Remove " + member.name + " from the trip? Their preferences and votes will be deleted."
    );
    if (!sure) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await api.delete("/trips/" + tripId + "/members/" + member._id);
      setMessage(response.data.message);
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Is this person already in the trip or already invited?
  function isAlreadyAdded(person) {
    for (let i = 0; i < trip.members.length; i++) {
      if (trip.members[i]._id === person._id) {
        return true;
      }
    }
    return trip.invitedEmails.includes(person.email);
  }

  if (!trip) {
    if (error) {
      return <Message type="error" text={error} />;
    }
    return <Loading text="Loading members..." />;
  }

  const isOrganiser = trip.organiser._id === user.id;
  const canChangeMembers = isOrganiser && trip.status === "planning";

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <h1>Members</h1>

        {canChangeMembers && (
          <Card>
            <h3>Invite someone already on TripSync AI</h3>
            <form onSubmit={handleSearch} className="inline-form">
              <input
                placeholder="Search by name or email"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                minLength={2}
                required
              />
              <Button type="submit">Search</Button>
            </form>

            {searched && searchResults.length === 0 && (
              <p className="muted small">Nobody found. You can invite them by email below.</p>
            )}

            {searchResults.map((person) => (
              <div key={person._id} className="row-between search-result">
                <span>
                  {person.name} <span className="muted">({person.email})</span>
                </span>
                {isAlreadyAdded(person) ? (
                  <span className="tag">Already added</span>
                ) : (
                  <Button size="small" onClick={() => sendInvite(person.email)}>Invite</Button>
                )}
              </div>
            ))}

            <hr />

            <h3>Or invite by email</h3>
            <p className="muted small">
              Works even if they don't have an account yet. They join after they sign up
              or log in with that email and click "Accept".
            </p>
            <form onSubmit={handleInviteByEmail} className="inline-form">
              <input
                type="email"
                placeholder="Their email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit">Send invite</Button>
            </form>
          </Card>
        )}

        <Message type="success" text={message} />
        <Message type="error" text={error} />

        {/* People who were invited but haven't accepted yet */}
        {trip.invitedEmails.length > 0 && (
          <Card>
            <h3>Waiting for reply</h3>
            <p className="muted small">
              The itinerary can be generated once everyone invited has accepted or declined.
            </p>
            {trip.invitedEmails.map((invitedEmail) => (
              <div key={invitedEmail} className="row-between search-result">
                <span>
                  ✉️ {invitedEmail} <span className="tag">Invited</span>
                </span>
                {canChangeMembers && (
                  <Button variant="outline" size="small" onClick={() => handleCancelInvite(invitedEmail)}>
                    Cancel invite
                  </Button>
                )}
              </div>
            ))}
          </Card>
        )}

        <Card>
          <h3>Members</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                {isOrganiser && <th>Preferences</th>}
                {canChangeMembers && <th></th>}
              </tr>
            </thead>
            <tbody>
              {trip.members.map((member) => (
                <tr key={member._id}>
                  <td>
                    {member.name}
                    {member._id === trip.organiser._id && <span className="tag">Organiser</span>}
                  </td>
                  <td>{member.email}</td>
                  {isOrganiser && (
                    <td>{submittedUserIds.includes(member._id) ? "✅ Submitted" : "⏳ Waiting"}</td>
                  )}
                  {canChangeMembers && (
                    <td>
                      {member._id !== trip.organiser._id && (
                        <Button variant="outline" size="small" onClick={() => handleRemove(member)}>
                          Remove
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {isOrganiser && (
            <p className="muted small">Everyone must submit preferences before you can generate the itinerary.</p>
          )}
        </Card>
      </section>
    </div>
  );
}

export default MembersPage;
