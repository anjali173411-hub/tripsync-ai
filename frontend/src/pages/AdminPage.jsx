
import { useEffect, useState } from "react";
import api, { getErrorMessage, getCurrentUser, formatDate } from "../api/axios.js";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Message from "../components/ui/Message.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

function AdminPage() {
  const user = getCurrentUser();

  const [summary, setSummary] = useState(null); // totalUsers, totalTrips, planningTrips, completedTrips
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  // Runs once when the page opens
  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const summaryResponse = await api.get("/admin/summary");
      setSummary(summaryResponse.data);

      const usersResponse = await api.get("/admin/users");
      setUsers(usersResponse.data.users);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Turn a user account on or off
  async function handleToggleActive(account) {
    let action = "activate";
    if (account.isActive) {
      action = "deactivate";
    }

    const sure = window.confirm("Are you sure you want to " + action + " " + account.name + "?");
    if (!sure) {
      return;
    }

    try {
      await api.patch("/admin/users/" + account._id + "/status", {
        isActive: !account.isActive
      });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div>
      {/* Purple banner, like the traveller dashboard */}
      <Card className="hero">
        <p className="eyebrow">Administrator</p>
        <PageHeader title="Admin Dashboard">
          See how TripSync AI is being used, manage user accounts, and add destinations
          from the Destinations page.
        </PageHeader>
      </Card>
      <Message type="error" text={error} />

      {/* Platform numbers */}
      {summary && (
        <div>
          {/* Platform analytics (FR-10.2) */}
          <div className="stats">
            <Card className="stat"><h2>{summary.totalUsers}</h2><p>Users</p></Card>
            <Card className="stat"><h2>{summary.totalTrips}</h2><p>Trips</p></Card>
            <Card className="stat"><h2>{summary.soloTrips}</h2><p>Solo trips</p></Card>
            <Card className="stat"><h2>{summary.groupTrips}</h2><p>Group trips</p></Card>
            <Card className="stat"><h2>{summary.averageGroupSize}</h2><p>Average group size</p></Card>
            <Card className="stat"><h2>{summary.planningTrips}</h2><p>Planning</p></Card>
            <Card className="stat"><h2>{summary.completedTrips}</h2><p>Completed</p></Card>
          </div>

          <Card>
            <h2>Most popular destinations</h2>
            {summary.popularDestinations.length === 0 && <p className="muted">No trips yet.</p>}
            {summary.popularDestinations.map((place, index) => (
              <div key={place.name} className="bar-row">
                <span>{index + 1}. {place.name}</span>
                <div className="progress small">
                  <div
                    className="progress-fill"
                    style={{ width: (place.trips / summary.popularDestinations[0].trips) * 100 + "%" }}
                  />
                </div>
                <span>{place.trips} trip{place.trips === 1 ? "" : "s"}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Table of all users */}
      <Card>
        <h2>Users</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((account) => (
              <tr key={account._id}>
                <td>{account.name}</td>
                <td>{account.email}</td>
                <td>{account.role}</td>
                <td>{formatDate(account.createdAt)}</td>
                <td>{account.isActive ? "Active" : "Deactivated"}</td>
                <td>
            
                  {account._id !== user.id && (
                    <Button variant="outline" size="small" onClick={() => handleToggleActive(account)}>
                      {account.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default AdminPage;
