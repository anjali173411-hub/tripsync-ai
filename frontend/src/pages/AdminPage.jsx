// Admin dashboard (FR-10): platform numbers, popular destinations and all user accounts.

import { useEffect, useState } from "react";
import api, { getErrorMessage, getCurrentUser, formatDate } from "../api/axios.js";

function AdminPage() {
  const user = getCurrentUser();

  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

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
    const action = account.isActive ? "Deactivate" : "Activate";
    if (!window.confirm(action + " " + account.name + "?")) {
      return;
    }
    try {
      await api.patch("/admin/users/" + account._id + "/status", { isActive: !account.isActive });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="hero">
        <h1>Admin Dashboard</h1>
        <p>See how TripSync AI is used and manage user accounts.</p>
      </div>

      {error && <p className="error-box">{error}</p>}

      {/* Platform numbers (FR-10.2) */}
      {summary && (
        <div className="grid">
          <div className="box"><p className="big-number">{summary.totalUsers}</p><p className="muted">Users</p></div>
          <div className="box"><p className="big-number">{summary.totalTrips}</p><p className="muted">Trips</p></div>
          <div className="box"><p className="big-number">{summary.soloTrips}</p><p className="muted">Solo trips</p></div>
          <div className="box"><p className="big-number">{summary.groupTrips}</p><p className="muted">Group trips</p></div>
          <div className="box"><p className="big-number">{summary.averageGroupSize}</p><p className="muted">Average group size</p></div>
          <div className="box"><p className="big-number">{summary.planningTrips}</p><p className="muted">Planning</p></div>
          <div className="box"><p className="big-number">{summary.completedTrips}</p><p className="muted">Completed</p></div>
        </div>
      )}

      {summary && (
        <div className="box">
          <h3>Most popular destinations</h3>
          {summary.popularDestinations.length === 0 && <p className="muted">No trips yet.</p>}
          {summary.popularDestinations.map((place) => (
            <div key={place.name} className="row">
              <span>{place.name}</span>
              <b>{place.trips} trip(s)</b>
            </div>
          ))}
        </div>
      )}

      {/* All users */}
      <div className="box scroll">
        <h3>Users</h3>
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th></th></tr>
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
                  {/* An admin can't deactivate their own account */}
                  {account._id !== user.id && (
                    <button className="small-button" onClick={() => handleToggleActive(account)}>
                      {account.isActive ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPage;
