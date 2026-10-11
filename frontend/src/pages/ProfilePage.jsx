// My profile (FR-1.4): change my name and my default travel preferences.
// The defaults fill in the "My Preferences" form whenever I join a new trip.

import { useEffect, useState } from "react";
import api, { getErrorMessage, getCurrentUser, saveLogin } from "../api/axios.js";
import Button from "../components/ui/Button.jsx";
import Message from "../components/ui/Message.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

function ProfilePage() {
  // Choices that come from the backend
  const [interestOptions, setInterestOptions] = useState([]);
  const [paceOptions, setPaceOptions] = useState([]);

  // What the user fills in
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState([]);
  const [pace, setPace] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Runs once when the page opens
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

  // Tick or untick one interest
  function toggleInterest(interest) {
    if (interests.includes(interest)) {
      const newList = [];
      for (let i = 0; i < interests.length; i++) {
        if (interests[i] !== interest) {
          newList.push(interests[i]);
        }
      }
      setInterests(newList);
    } else {
      setInterests([...interests, interest]);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await api.put("/profile", {
        name: name,
        defaultInterests: interests,
        defaultPace: pace
      });

      // Keep the new name in the top bar too
      const savedUser = getCurrentUser();
      savedUser.name = response.data.user.name;
      saveLogin(localStorage.getItem("token"), savedUser);

      setMessage("Profile saved!");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form className="card narrow-wide" onSubmit={handleSave}>
      <PageHeader title="My Profile">{email}</PageHeader>

      <label>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} required />

      <h3>My usual travel style</h3>
      <p className="muted small">
        These fill in your preferences automatically whenever you join a new trip.
        You can still change them for each trip.
      </p>

      <label>Interests</label>
      <div className="chip-list">
        {interestOptions.map((interest) => (
          <button
            type="button"
            key={interest}
            className={interests.includes(interest) ? "chip selected" : "chip"}
            onClick={() => toggleInterest(interest)}
          >
            {interest}
          </button>
        ))}
      </div>

      <label>Pace</label>
      <div className="chip-list">
        {paceOptions.map((option) => (
          <button
            type="button"
            key={option}
            className={pace === option ? "chip selected" : "chip"}
            onClick={() => setPace(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <Button type="submit">Save profile</Button>

      <Message type="success" text={message} />
      <Message type="error" text={error} />
    </form>
  );
}

export default ProfilePage;
