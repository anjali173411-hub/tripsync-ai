// My profile (FR-1.4): my name and my usual travel style.
// The usual travel style fills in "My Preferences" whenever I join a new trip.

import { useEffect, useState } from "react";
import { Chip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import api, { getErrorMessage, getCurrentUser, saveLogin } from "../api/axios.js";

function ProfilePage() {
  const [interestOptions, setInterestOptions] = useState([]);
  const [paceOptions, setPaceOptions] = useState([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState([]);
  const [pace, setPace] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const optionsResponse = await api.get("/options");
      setInterestOptions(optionsResponse.data.interestOptions);
      setPaceOptions(optionsResponse.data.paceOptions);

      const profileResponse = await api.get("/profile");
      const user = profileResponse.data.user;
      setName(user.name);
      setEmail(user.email);
      setInterests(user.defaultPreferences.interests);
      setPace(user.defaultPreferences.pace);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await api.put("/profile", {
        name: name,
        defaultInterests: interests,
        defaultPace: pace
      });

      // Show the new name in the top bar too
      const savedUser = getCurrentUser();
      savedUser.name = response.data.user.name;
      saveLogin(localStorage.getItem("token"), savedUser);

      notifications.show({ message: "Profile saved", color: "green" });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form className="box narrow-box" onSubmit={handleSave}>
      <h1>My Profile</h1>
      <p className="muted">{email}</p>

      <label>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} required />

      {/* Travel style is only for travellers; admins don't plan trips */}
      {getCurrentUser().role !== "admin" && (
        <div>
          <h3>My usual travel style</h3>
          <p className="muted small">This fills in your preferences whenever you join a new trip.</p>

          <label>Interests</label>
          <Chip.Group multiple value={interests} onChange={setInterests}>
            <div className="chip-list">
              {interestOptions.map((interest) => <Chip key={interest} value={interest}>{interest}</Chip>)}
            </div>
          </Chip.Group>

          <label>Pace</label>
          <select value={pace} onChange={(e) => setPace(e.target.value)}>
            {paceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      )}

      {error && <p className="error-box">{error}</p>}

      <div className="button-row">
        <button type="submit">Save profile</button>
      </div>
    </form>
  );
}

export default ProfilePage;
