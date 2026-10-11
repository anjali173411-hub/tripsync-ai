// Destinations and their reviews.
// - Everyone sees destinations with their average rating (FR-9.2).
// - If you completed a trip to a destination, you can review it (FR-9.1).
// - Admins add, edit and remove destinations (FR-10.1)
//   and can hide or remove reviews (FR-9.3).
// Built with Mantine components (Card, Image, Rating, Modal, SegmentedControl ...).

import { useEffect, useState } from "react";
import {
  Card, Image, Title, Text, Button, Badge, Group, Stack, SimpleGrid, Rating, Modal, TextInput, Textarea,
  SegmentedControl, Alert, Paper, Divider
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Plus, Pencil, Trash2, Eye, EyeOff, MapPin } from "lucide-react";
import api, { getErrorMessage, getCurrentUser } from "../api/axios.js";
import { confirmAction } from "../components/ui/confirm.jsx";

function ReviewsPage() {
  const user = getCurrentUser();
  const isAdmin = user.role === "admin";

  // Choices from the backend
  const [maxRating, setMaxRating] = useState(5);
  const [costTiers, setCostTiers] = useState([]);

  const [destinations, setDestinations] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]); // my trips that are finished
  const [selectedDestination, setSelectedDestination] = useState(null); // its reviews pop-up is open
  const [reviews, setReviews] = useState([]);

  // Destination form (admin), shown in a pop-up. editingId is "" when adding a new destination.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCostTier, setFormCostTier] = useState("");
  const [formImages, setFormImages] = useState(""); // one link per line

  // "Write your review" form
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const [error, setError] = useState("");

  // Runs once when the page opens
  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const optionsResponse = await api.get("/options");
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

  // User clicks a destination card: open its reviews
  async function handleSelectDestination(destination) {
    setSelectedDestination(destination);
    setReviews([]);
    setRating(0);
    setComment("");
    setError("");

    try {
      await loadReviews(destination);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // ---------------- Admin: destinations (FR-10.1) ----------------

  // Open an empty form for a new destination
  function startAdding() {
    setEditingId("");
    setFormName("");
    setFormLocation("");
    setFormDescription("");
    setFormCostTier(costTiers[0]);
    setFormImages("");
    setFormOpen(true);
  }

  // Open the form filled with a destination so the admin can change it
  function startEditing(destination) {
    setEditingId(destination._id);
    setFormName(destination.name);
    setFormLocation(destination.location);
    setFormDescription(destination.description);
    setFormCostTier(destination.averageCostTier);
    setFormImages(destination.images.join("\n"));
    setFormOpen(true);
  }

  async function handleSaveDestination(event) {
    event.preventDefault();
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
        notifications.show({ message: "Destination updated ✓", color: "green" });
      } else {
        await api.post("/destinations", data);
        notifications.show({ message: "Destination added ✓", color: "green" });
      }

      setFormOpen(false);
      await loadDestinations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handleDeleteDestination(destination) {
    confirmAction({
      title: "Remove " + destination.name + "?",
      text: "The destination and all its reviews will be deleted.",
      confirmLabel: "Remove",
      danger: true,
      onConfirm: () => deleteDestination(destination)
    });
  }

  async function deleteDestination(destination) {
    try {
      await api.delete("/destinations/" + destination._id);
      setSelectedDestination(null);
      notifications.show({ message: "Destination removed" });
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

  function handleDeleteReview(review) {
    confirmAction({
      title: "Remove this review?",
      text: "It will be deleted for good.",
      confirmLabel: "Remove",
      danger: true,
      onConfirm: () => deleteReview(review)
    });
  }

  async function deleteReview(review) {
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
    setError("");

    if (rating === 0) {
      setError("Please click the stars to give a rating");
      return;
    }

    try {
      await api.post("/reviews", {
        destinationId: selectedDestination._id,
        tripId: tripId,
        rating: rating,
        comment: comment
      });

      notifications.show({ title: "Thanks! ⭐", message: "Your review was submitted.", color: "green" });
      setRating(0);
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

  // ---------------- What to show ----------------

  let myTrip = null;
  if (selectedDestination) {
    myTrip = findMyTripToSelectedDestination();
  }

  // The cost choices for the admin form: [{ value: "budget", label: "Budget" }, ...]
  const costChoices = [];
  for (let i = 0; i < costTiers.length; i++) {
    costChoices.push({ value: costTiers[i], label: costTiers[i].charAt(0).toUpperCase() + costTiers[i].substring(1) });
  }

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={1}>{isAdmin ? "Destinations" : "Destinations & Reviews"}</Title>
          <Text c="dimmed">Click a destination to read its reviews.</Text>
        </div>
        {isAdmin && (
          <Button size="md" leftSection={<Plus size={18} />} onClick={startAdding}>Add destination</Button>
        )}
      </Group>

      {error && !selectedDestination && !formOpen && <Alert color="red" variant="light" mb="md">{error}</Alert>}

      {destinations.length === 0 && <Text c="dimmed">No destinations have been added yet.</Text>}

      {/* One card per destination. Click one to see its reviews. */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        {destinations.map((destination) => (
          <Card key={destination._id} className="destination-card" onClick={() => handleSelectDestination(destination)}>
            <Card.Section>
              {destination.images.length > 0 && (
                <Image src={destination.images[0]} h={160} alt={destination.name} />
              )}
              {destination.images.length === 0 && (
                <div className="destination-no-photo"><MapPin size={36} /></div>
              )}
            </Card.Section>

            <Group justify="space-between" mt="md" wrap="nowrap">
              <Title order={3}>{destination.name}</Title>
              <Badge variant="light" className="capitalize">{destination.averageCostTier}</Badge>
            </Group>
            <Text size="sm" c="dimmed">{destination.location}</Text>

            {/* Average rating (FR-9.2) */}
            <Group gap={6} my="xs">
              <Rating value={destination.averageRating} fractions={2} readOnly count={maxRating} />
              <Text size="sm" c="dimmed">
                {destination.reviewCount > 0
                  ? destination.averageRating + " (" + destination.reviewCount + " review" + (destination.reviewCount === 1 ? "" : "s") + ")"
                  : "No reviews yet"}
              </Text>
            </Group>

            <Text size="sm" lineClamp={3}>{destination.description}</Text>

            {isAdmin && (
              <Group mt="md" gap="xs">
                <Button size="xs" variant="light" leftSection={<Pencil size={14} />}
                  onClick={(e) => { e.stopPropagation(); startEditing(destination); }}>
                  Edit
                </Button>
                <Button size="xs" variant="light" color="red" leftSection={<Trash2 size={14} />}
                  onClick={(e) => { e.stopPropagation(); handleDeleteDestination(destination); }}>
                  Remove
                </Button>
              </Group>
            )}
          </Card>
        ))}
      </SimpleGrid>

      {/* Pop-up: reviews of the selected destination */}
      <Modal
        opened={selectedDestination !== null}
        onClose={() => setSelectedDestination(null)}
        title={selectedDestination ? "Reviews for " + selectedDestination.name : ""}
        size="lg"
        centered
      >
        {selectedDestination && (
          <Stack>
            {reviews.length === 0 && <Text c="dimmed">No reviews yet.</Text>}

            {reviews.map((review) => (
              <Paper key={review._id} withBorder radius="md" p="sm" opacity={review.visible ? 1 : 0.55}>
                <Group justify="space-between">
                  <Group gap="xs">
                    <Rating value={review.rating} readOnly size="sm" count={maxRating} />
                    <Text fw={600} size="sm">{review.user ? review.user.name : "Unknown"}</Text>
                    {!review.visible && <Badge color="gray" size="sm">Hidden</Badge>}
                  </Group>

                  {/* Admin moderation (FR-9.3) */}
                  {isAdmin && (
                    <Group gap={4}>
                      <Button size="compact-xs" variant="subtle" color="gray"
                        leftSection={review.visible ? <EyeOff size={12} /> : <Eye size={12} />}
                        onClick={() => handleToggleReview(review)}>
                        {review.visible ? "Hide" : "Show again"}
                      </Button>
                      <Button size="compact-xs" variant="subtle" color="red" onClick={() => handleDeleteReview(review)}>
                        Remove
                      </Button>
                    </Group>
                  )}
                </Group>
                {review.comment && <Text size="sm" mt={6}>{review.comment}</Text>}
              </Paper>
            ))}

            {/* Only shown if I completed a trip to this destination */}
            {myTrip && (
              <form onSubmit={(e) => handleSubmitReview(e, myTrip._id)}>
                <Divider mb="md" label="Write your review" labelPosition="left" />
                <Stack>
                  <div>
                    <Text fw={600} size="sm" mb={4}>Your rating</Text>
                    <Rating value={rating} onChange={setRating} size="xl" count={maxRating} />
                  </div>
                  <Textarea label="Comment" autosize minRows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
                  {error && <Alert color="red" variant="light">{error}</Alert>}
                  <Group justify="flex-end">
                    <Button type="submit">Submit review</Button>
                  </Group>
                </Stack>
              </form>
            )}
          </Stack>
        )}
      </Modal>

      {/* Pop-up: admin adds or edits a destination */}
      <Modal opened={formOpen} onClose={() => setFormOpen(false)} title={editingId ? "Edit destination" : "Add a destination"} size="lg" centered>
        <form onSubmit={handleSaveDestination}>
          <Stack>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              <TextInput label="Country / region" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} />
            </SimpleGrid>
            <Textarea label="Description" autosize minRows={2} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            <div>
              <Text fw={600} size="sm" mb={6}>Usual cost</Text>
              <SegmentedControl fullWidth data={costChoices} value={formCostTier} onChange={setFormCostTier} />
            </div>
            <Textarea
              label="Photo links"
              description="One link per line. The first photo is shown on the cards."
              autosize
              minRows={2}
              value={formImages}
              onChange={(e) => setFormImages(e.target.value)}
            />
            {error && <Alert color="red" variant="light">{error}</Alert>}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit">{editingId ? "Save changes" : "Add destination"}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </div>
  );
}

export default ReviewsPage;
