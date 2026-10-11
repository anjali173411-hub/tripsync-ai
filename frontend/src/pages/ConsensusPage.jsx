// Group Decisions: things the AI found the group disagrees on (FR-5.3 to FR-5.5).
// Each conflict has 2-3 options. Members vote; the organiser can also decide directly.
// An option is chosen automatically when more than half of the group votes for it.
// Built with Mantine components (Badge, Avatar, Progress, Button, Alert ...).

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, Title, Text, Button, Badge, Avatar, Group, Progress, Alert, Anchor, Center, ThemeIcon, Loader } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { Scale, CheckCircle2, Clock } from "lucide-react";
import api, { getErrorMessage, getCurrentUser, formatMoney } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";

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
      notifications.show({ message: "Vote saved ✓", color: "green" });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // The organiser picks an option for everyone
  function handleDecide(conflictId, optionIndex) {
    modals.openConfirmModal({
      title: "Decide this for everyone?",
      centered: true,
      children: <Text size="sm">This option will be chosen for the whole group, and voting on this decision ends.</Text>,
      labels: { confirm: "Choose this option", cancel: "Cancel" },
      confirmProps: { color: "maroon" },
      onConfirm: () => decide(conflictId, optionIndex)
    });
  }

  async function decide(conflictId, optionIndex) {
    setError("");

    try {
      await api.post("/trips/" + tripId + "/conflicts/" + conflictId + "/resolve", {
        optionIndex: optionIndex
      });
      notifications.show({ message: "Decision made ✓", color: "green" });
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
      return <Alert color="red" variant="light">{error}</Alert>;
    }
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  const isOrganiser = trip.organiser._id === user.id;

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <Title order={1}>Group Decisions</Title>
        <Text c="dimmed" mb="lg">
          When members want different things, the AI suggests compromises. Vote for the one you prefer.
          An option is chosen once more than half of the group votes for it.
        </Text>

        {error && <Alert color="red" variant="light" mb="md">{error}</Alert>}

        {/* No itinerary yet */}
        {!itinerary && (
          <Card p={40} ta="center">
            <Center mb="md"><ThemeIcon size={60} radius="xl" variant="light"><Scale size={28} /></ThemeIcon></Center>
            <Text mb="xs">Nothing to decide yet. The AI finds conflicts when the itinerary is generated.</Text>
            <Anchor component={Link} to={"/trips/" + tripId + "/itinerary"} fw={700}>Go to Itinerary →</Anchor>
          </Card>
        )}

        {/* Itinerary exists but no conflicts */}
        {itinerary && conflicts.length === 0 && (
          <Card p={40} ta="center">
            <Text fz={40}>🎉</Text>
            <Text fw={700}>No conflicts – the AI found a plan that suits everyone.</Text>
          </Card>
        )}

        {/* Small summary: how many decisions are open, how many are done */}
        {itinerary && conflicts.length > 0 && (
          <Group mb="md">
            <Badge size="xl" color="yellow" variant="light" leftSection={<Clock size={16} />}>{countOpen()} to decide</Badge>
            <Badge size="xl" variant="light" leftSection={<CheckCircle2 size={16} />}>{conflicts.length - countOpen()} decided</Badge>
          </Group>
        )}

        {/* One card for each conflict */}
        {itinerary && conflicts.map((conflict) => {
          const myVote = getMyVote(conflict);
          const canVote = !conflict.resolved && itinerary.status !== "finalised";
          const letters = ["A", "B", "C", "D"];

          // The coloured label at the top of the card
          let statusText = "Decided";
          let statusColor = "maroon";
          if (canVote && myVote === -1) {
            statusText = "Needs your vote";
            statusColor = "orange";
          } else if (canVote) {
            statusText = "Waiting for others";
            statusColor = "yellow";
          }

          return (
            <div key={conflict._id} className="decision-card">
              {/* Top: label, title, who it affects */}
              <div className="decision-head">
                <Badge
                  color={statusColor}
                  variant={statusText === "Waiting for others" ? "light" : "filled"}
                  className={statusText === "Needs your vote" ? "needs-vote" : ""}
                >
                  {statusText}
                </Badge>

                <Group gap="sm" my="sm" wrap="nowrap">
                  <ThemeIcon size={40} radius="md"><Scale size={20} /></ThemeIcon>
                  <Title order={2} className="decision-title">{conflict.conflictDescription}</Title>
                </Group>

                {conflict.affectedMembers.length > 0 && (
                  <Group gap="xs">
                    {conflict.affectedMembers.map((name) => (
                      <Badge key={name} variant="default" size="lg" radius="xl" pl={3}
                        leftSection={<Avatar size={20} color="maroon" variant="filled" radius="xl">{name.charAt(0).toUpperCase()}</Avatar>}>
                        {name}
                      </Badge>
                    ))}
                  </Group>
                )}

                <Text size="sm" c="dimmed" mt="sm">{conflict.reasoning}</Text>
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
                      <Group justify="space-between">
                        <Avatar radius="xl" color="maroon" variant={isMine || isChosen ? "filled" : "light"}>{letters[index]}</Avatar>
                        <Badge color={option.extraCost > 0 ? "orange" : "green"} variant="light">
                          {option.extraCost > 0 ? "+" + formatMoney(option.extraCost, currency) : "No extra cost"}
                        </Badge>
                      </Group>

                      <Text fw={600} my="md" style={{ flex: 1 }}>{option.description}</Text>

                      {/* Vote bar */}
                      <Progress value={votePercent} size="md" radius="xl" />
                      <Text size="xs" c="dimmed" mt={6} mb="sm">{option.voteCount} of {trip.members.length} {trip.members.length === 1 ? "vote" : "votes"}</Text>

                      {isChosen && (
                        <Text c="maroon.7" fw={800}><CheckCircle2 size={16} /> Group's choice</Text>
                      )}

                      {canVote && (
                        <Button fullWidth variant={isMine ? "filled" : "outline"} onClick={() => handleVote(conflict._id, index)}>
                          {isMine ? "✓ Your vote" : "Vote " + letters[index]}
                        </Button>
                      )}

                      {canVote && isOrganiser && (
                        <Button variant="subtle" color="gray" size="xs" mt={6} onClick={() => handleDecide(conflict._id, index)}>
                          Decide this for everyone
                        </Button>
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
