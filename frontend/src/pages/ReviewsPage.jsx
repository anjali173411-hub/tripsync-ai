// Destinations and their reviews.
// - Everyone sees destinations with their average rating (FR-9.2).
// - If you completed a trip to a destination, you can review it (FR-9.1).
// - Admins add, edit and remove destinations (FR-10.1)
//   and can hide or remove reviews (FR-9.3).

import { useEffect, useState } from "react";
import api, { getErrorMessage, getCurrentUser } from "../api/axios.js";

function ReviewsPage() {
  const user = getCurrentUser();
  const isAdmin = user.role === "admin";

  // Choices from the backend
  const [minRating, setMinRating] = useState(0);
  const [maxRating, setMaxRating] = useState(0);
  const [costTiers, setCostTiers] = useState([]);

  const [destinations, setDestinations] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]); // my trips that are finished
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [reviews, setReviews] = useState([]);

  // Destination form (admin). editingId is "" when adding a new destination.
  const [editingId, setEditingId] = useState("");
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCostTier, setFormCostTier] = useState("");
  const [formImages, setFormImages] = useState(""); // one link per line

  // "Write your review" form
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Runs once when the page opens
  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const optionsResponse = await api.get("/options");
      setMinRating(optionsResponse.data.minRating);
      setMaxRating(optionsResponse.data.maxRating);
      setCostTiers(optionsResponse.data.costTiers);
      setFormCostTier(optionsResponse.data.costTiers[0]);

      await loadDestinations();

      // Keep only my trips that are completed
      const tripsResponse = await api.get("/trips");
      const allTrips = tripsResponse.data.trips;
      const finished = [];
      for (let i = 0; i < allTrips.length; i++) {
        if (allTrips[i].status === "completed") {
          finished.push(allTrips[i]);
        }
      }
      setCompletedTrips(finished);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function loadDestinations() {
    const response = await api.get("/destinations");
    setDestinations(response.data.destinations);
  }

  async function loadReviews(destination) {
    const response = await api.get("/destinations/" + destination._id + "/reviews");
    setReviews(response.data.reviews);
  }

  // User clicks a destination card: show its reviews
  async function handleSelectDestination(destination) {
    setSelectedDestination(destination);
    setReviews([]);
    setMessage("");
    setError("");

    try {
      await loadReviews(destination);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // ---------------- Admin: destinations (FR-10.1) ----------------

  function clearDestinationForm() {
    setEditingId("");
    setFormName("");
    setFormLocation("");
    setFormDescription("");
    setFormCostTier(costTiers[0]);
    setFormImages("");
  }

  // Fill the form with a destination so the admin can change it
  function startEditing(destination) {
    setEditingId(destination._id);
    setFormName(destination.name);
    setFormLocation(destination.location);
    setFormDescription(destination.description);
    setFormCostTier(destination.averageCostTier);
    setFormImages(destination.images.join("\n"));
    window.scrollTo(0, 0);
  }

  async function handleSaveDestination(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const data = {
      name: formName,
      location: formLocation,
      description: formDescription,
      averageCostTier: formCostTier,
      images: formImages.split("\n") // one link per line
    };

    try {
      if (editingId) {
        await api.put("/destinations/" + editingId, data);
        setMessage("Destination updated");
      } else {
        await api.post("/destinations", data);
        setMessage("Destination added");
      }

      clearDestinationForm();
      await loadDestinations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDeleteDestination(destination) {
    const sure = window.confirm("Remove " + destination.name + " and all its reviews?");
    if (!sure) {
      return;
    }

    try {
      await api.delete("/destinations/" + destination._id);
      setSelectedDestination(null);
      setMessage("Destination removed");
      await loadDestinations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // ---------------- Admin: reviews (FR-9.3) ----------------

  async function handleToggleReview(review) {
    try {
      await api.patch("/reviews/" + review._id + "/visibility", { visible: !review.visible });
      await loadReviews(selectedDestination);
      await loadDestinations(); // the average rating may change
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDeleteReview(review) {
    const sure = window.confirm("Remove this review for good?");
    if (!sure) {
      return;
    }

    try {
      await api.delete("/reviews/" + review._id);
      await loadReviews(selectedDestination);
      await loadDestinations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // ---------------- Travellers: write a review (FR-9.1) ----------------

  async function handleSubmitReview(event, tripId) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await api.post("/reviews", {
        destinationId: selectedDestination._id,
        tripId: tripId,
        rating: Number(rating),
        comment: comment
      });

      setMessage("Thanks! Your review was submitted.");
      setRating("");
      setComment("");
      await loadReviews(selectedDestination);
      await loadDestinations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Finds my completed trip to the selected destination (or null if there isn't one)
  function findMyTripToSelectedDestination() {
    const destinationName = selectedDestination.name.trim().toLowerCase();

    for (let i = 0; i < completedTrips.length; i++) {
      const tripDestination = completedTrips[i].destination.trim().toLowerCase();
      if (tripDestination === destinationName) {
        return completedTrips[i];
      }
    }

    return null;
  }

  // Turns a number into stars, for example 3 -> ★★★
  function makeStars(count) {
    return "★".repeat(Math.round(count));
  }

  // ---------------- What to show ----------------

  // Rating choices from highest to lowest, for example [5, 4, 3, 2, 1]
  const ratingChoices = [];
  for (let n = maxRating; n >= minRating && n > 0; n--) {
    ratingChoices.push(n);
  }

  let myTrip = null;
  if (selectedDestination) {
    myTrip = findMyTripToSelectedDestination();
  }

  return (
    <div>
      <h1>{isAdmin ? "Destinations" : "Destinations & Reviews"}</h1>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {/* Admin only: add or edit a destination */}
      {isAdmin && (
        <form className="card" onSubmit={handleSaveDestination}>
          <h3>{editingId ? "Edit destination" : "Add a destination"}</h3>

          <div className="two-columns">
            <div>
              <label>Name</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} required />
            </div>
            <div>
              <label>Country / region</label>
              <input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} />
            </div>
          </div>

          <label>Description</label>
          <textarea rows="2" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />

          <label>Usual cost</label>
          <div className="chip-list">
            {costTiers.map((tier) => (
              <button
                type="button"
                key={tier}
                className={formCostTier === tier ? "chip selected" : "chip"}
                onClick={() => setFormCostTier(tier)}
              >
                {tier}
              </button>
            ))}
          </div>

          <label>Photo links (one per line)</label>
          <textarea rows="2" value={formImages} onChange={(e) => setFormImages(e.target.value)} />

          <div className="button-row">
            <button type="submit">{editingId ? "Save changes" : "Add destination"}</button>
            {editingId && (
              <button type="button" className="btn-outline" onClick={clearDestinationForm}>Cancel</button>
            )}
          </div>
        </form>
      )}

      {destinations.length === 0 && <p className="muted">No destinations have been added yet.</p>}

      {/* One card per destination. Click one to see its reviews. */}
      <div className="grid">
        {destinations.map((destination) => (
          <div
            key={destination._id}
            className="card trip-card"
            onClick={() => handleSelectDestination(destination)}
          >
            {destination.images.length > 0 && (
              <img className="destination-image" src={destination.images[0]} alt={destination.name} />
            )}
            <div className="row-between">
              <h3>{destination.name}</h3>
              <span className="tag">{destination.averageCostTier}</span>
            </div>
            <p className="muted">{destination.location}</p>

            {/* Average rating (FR-9.2) */}
            {destination.reviewCount > 0 && (
              <p>
                <span className="stars">{makeStars(destination.averageRating)}</span>{" "}
                {destination.averageRating} ({destination.reviewCount} review{destination.reviewCount === 1 ? "" : "s"})
              </p>
            )}
            {destination.reviewCount === 0 && <p className="muted small">No reviews yet</p>}

            <p>{destination.description}</p>

            {isAdmin && (
              <div className="button-row">
                <button
                  className="btn-small btn-outline"
                  onClick={(e) => { e.stopPropagation(); startEditing(destination); }}
                >
                  Edit
                </button>
                <button
                  className="btn-small btn-danger"
                  onClick={(e) => { e.stopPropagation(); handleDeleteDestination(destination); }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reviews of the selected destination */}
      {selectedDestination && (
        <div className="card">
          <h2>Reviews for {selectedDestination.name}</h2>

          {reviews.length === 0 && <p className="muted">No reviews yet.</p>}

          {reviews.map((review) => (
            <div key={review._id} className={review.visible ? "review" : "review hidden-review"}>
              <span className="stars">{makeStars(review.rating)}</span> – {review.user ? review.user.name : "Unknown"}
              {!review.visible && <span className="tag">Hidden</span>}
              <p>{review.comment}</p>

              {/* Admin moderation (FR-9.3) */}
              {isAdmin && (
                <div className="button-row">
                  <button className="btn-small btn-outline" onClick={() => handleToggleReview(review)}>
                    {review.visible ? "Hide" : "Show again"}
                  </button>
                  <button className="btn-small btn-danger" onClick={() => handleDeleteReview(review)}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Only shown if I completed a trip to this destination */}
          {myTrip && (
            <form onSubmit={(e) => handleSubmitReview(e, myTrip._id)}>
              <h3>Write your review</h3>

              <label>Rating</label>
              <select value={rating} onChange={(e) => setRating(e.target.value)} required>
                <option value="">Choose a rating</option>
                {ratingChoices.map((n) => (
                  <option key={n} value={n}>{makeStars(n)} ({n})</option>
                ))}
              </select>

              <label>Comment</label>
              <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} />

              <button type="submit">Submit review</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewsPage;
