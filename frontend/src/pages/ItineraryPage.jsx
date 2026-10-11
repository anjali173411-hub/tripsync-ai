
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Card, Title, Text, Button, Badge, Group, Stack, SimpleGrid, ThemeIcon, Alert, Anchor, Tabs, Timeline, Menu,
  ActionIcon, Modal, TextInput, NumberInput, Textarea, Accordion, Progress, Loader, Center
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  CalendarDays, RefreshCw, ArrowUp, ArrowDown, Pencil, Trash2, BedDouble, MoreVertical, Lock, Wallet,
  TrainFront, Bus, Car, Utensils, MapPin, Navigation
} from "lucide-react";
import api, { getErrorMessage, getCurrentUser, formatDate, formatMoney, travelModeText } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";

function ItineraryPage() {
  const { tripId } = useParams();
  const user = getCurrentUser();

  const [trip, setTrip] = useState(null);
  const [currency, setCurrency] = useState("");
  const [itinerary, setItinerary] = useState(null);  
  const [conflicts, setConflicts] = useState([]);      
  const [membersNotInPlan, setMembersNotInPlan] = useState([]); 
  const [selectedDay, setSelectedDay] = useState(0);  
  const [weatherDays, setWeatherDays] = useState([]); 
  const [editingId, setEditingId] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCost, setEditCost] = useState("");
  const [instructions, setInstructions] = useState("");    
  const [dayInstructions, setDayInstructions] = useState(""); 
  const [aiWorking, setAiWorking] = useState("");             

  const [error, setError] = useState("");


  useEffect(() => {
    loadPage();
  }, [tripId]);

  async function loadPage() {
    loadWeather();

    try {
      const tripResponse = await api.get("/trips/" + tripId);
      setTrip(tripResponse.data.trip);

      const optionsResponse = await api.get("/options");
      setCurrency(optionsResponse.data.currency);
    } catch (err) {
      setError(getErrorMessage(err));
      return;
    }

    try {
      const itineraryResponse = await api.get("/trips/" + tripId + "/itinerary");
      setItinerary(itineraryResponse.data.itinerary);
      setConflicts(itineraryResponse.data.conflicts);
      setMembersNotInPlan(itineraryResponse.data.membersNotInPlan);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setItinerary(null); // not generated yet, which is fine
      } else {
        setError(getErrorMessage(err));
      }
    }
  }

  async function loadWeather() {
    try {
      const response = await api.get("/trips/" + tripId + "/weather");
      setWeatherDays(response.data.days);
    } catch (err) {
      setWeatherDays([]);
    }
  }

  function getWeatherForDay(dayDate) {
    const dateText = new Date(dayDate).toISOString().substring(0, 10);

    for (let i = 0; i < weatherDays.length; i++) {
      if (weatherDays[i].date === dateText) {
        return weatherDays[i];
      }
    }

    return null;
  }

  // Asks the AI to plan the whole trip (FR-4.1). Used by "Generate", "Plan whole trip again"
  // and "Make it cheaper" - only the instructions are different.
  async function planTrip(instructionsText) {
    setError("");
    setAiWorking("trip");

    try {
      const response = await api.post("/trips/" + tripId + "/generate", {
        instructions: instructionsText
      });
      setItinerary(response.data.itinerary);
      setConflicts(response.data.conflicts);
      setSelectedDay(0);
      setInstructions("");
    } catch (err) {
      // If the AI failed, the backend saved nothing, so the old itinerary is still there
      setError(getErrorMessage(err));
    }

    setAiWorking("");
  }

  function handleGenerate() {
    planTrip(instructions);
  }

  // Organiser asks the AI for a cheaper version of the whole trip
  function handleMakeCheaper(totalCost) {
    const cheaperInstructions =
      "The current plan costs about " + totalCost + " " + currency + " for the whole group, " +
      "but the budget is " + trip.budget + " " + currency + ". Make a cheaper plan that fits the budget.";

    modals.openConfirmModal({
      title: "Make a cheaper plan?",
      centered: true,
      children: <Text size="sm">The AI will make a new, cheaper plan for the whole trip. Group decisions will start over.</Text>,
      labels: { confirm: "Make it cheaper", cancel: "Cancel" },
      confirmProps: { color: "maroon" },
      onConfirm: () => planTrip(cheaperInstructions)
    });
  }

  // Organiser plans only the selected day again (FR-4.3)
  async function handleRegenerateDay(dayNumber) {
    setError("");
    setAiWorking("day");

    try {
      const response = await api.post("/trips/" + tripId + "/days/" + dayNumber + "/regenerate", {
        instructions: dayInstructions
      });
      setItinerary(response.data.itinerary);
      setDayInstructions("");
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setAiWorking("");
  }

  // ---------------- Changing activities by hand (FR-4.4) ----------------

  // Fill the edit form with the activity's current values
  function startEditing(activity) {
    setEditingId(activity._id);
    setEditTime(activity.time);
    setEditName(activity.name);
    setEditDescription(activity.description);
    setEditCost(activity.estimatedCost);
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await api.put("/trips/" + tripId + "/activities/" + editingId, {
        time: editTime,
        name: editName,
        description: editDescription,
        estimatedCost: Number(editCost)
      });
      setItinerary(response.data.itinerary);
      setEditingId("");
      notifications.show({ message: "Activity saved ✓", color: "green" });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Move an activity earlier ("up") or later ("down") in the day
  async function handleMove(activityId, direction) {
    setError("");

    try {
      const response = await api.post("/trips/" + tripId + "/activities/" + activityId + "/move", {
        direction: direction
      });
      setItinerary(response.data.itinerary);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handleRemove(activity) {
    modals.openConfirmModal({
      title: "Remove this activity?",
      centered: true,
      children: <Text size="sm">{"\"" + activity.name + "\" will be removed from the itinerary."}</Text>,
      labels: { confirm: "Remove", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => removeActivity(activity)
    });
  }

  async function removeActivity(activity) {
    try {
      const response = await api.delete("/trips/" + tripId + "/activities/" + activity._id);
      setItinerary(response.data.itinerary);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Organiser locks the itinerary (FR-5.7)
  function handleFinalise() {
    modals.openConfirmModal({
      title: "Finalise the itinerary?",
      centered: true,
      children: <Text size="sm">The plan will be locked for everyone. It can't be changed afterwards.</Text>,
      labels: { confirm: "Finalise", cancel: "Cancel" },
      confirmProps: { color: "maroon" },
      onConfirm: finalise
    });
  }

  async function finalise() {
    try {
      await api.post("/trips/" + tripId + "/finalise");
      notifications.show({ title: "Plan finalised", message: "Have a great trip!", color: "green" });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // ---------------- Small calculations ----------------

  // Adds up the cost of a list of activities
  function getTotalCost(activities) {
    let total = 0;
    for (let i = 0; i < activities.length; i++) {
      total = total + activities[i].estimatedCost;
    }
    return total;
  }

  // Which part of the day an activity is in, from its time like "13:30"
  function getPartOfDay(time) {
    const hour = parseInt(String(time).substring(0, 2), 10);

    if (hour < 12) {
      return "Morning";
    }
    if (hour < 17) {
      return "Afternoon";
    }
    return "Evening"; // also used if the time can not be read
  }

  // A small picture for each kind of activity
  function getActivityIcon(activity) {
    if (activity.category === "travel") {
      if (trip.travelMode === "train") {
        return <TrainFront size={16} />;
      }
      if (trip.travelMode === "bus") {
        return <Bus size={16} />;
      }
      if (trip.travelMode === "car") {
        return <Car size={16} />;
      }
      return <Navigation size={16} />;
    }
    if (activity.category === "food") {
      return <Utensils size={16} />;
    }
    if (activity.category === "stay") {
      return <BedDouble size={16} />;
    }
    return <MapPin size={16} />;
  }

  // Counts the conflicts that are not decided yet
  function countOpenDecisions() {
    let count = 0;
    for (let i = 0; i < conflicts.length; i++) {
      if (!conflicts[i].resolved) {
        count = count + 1;
      }
    }
    return count;
  }

  // FR-5.6: the members an activity (or the stay) does NOT suit.
  // matchedMembers is the list of names the AI chose it for.
  // Returns [] if it suits everyone - then nothing is shown.
  function getNotMatched(matchedMembers) {
    // The AI gave no names (e.g. a train journey): nothing to say
    if (trip.type !== "group" || matchedMembers.length === 0) {
      return [];
    }

    const notMatched = [];
    for (let i = 0; i < trip.members.length; i++) {
      const name = trip.members[i].name;
      // People who joined after the plan was made are not in it yet, so skip them
      if (!matchedMembers.includes(name) && !membersNotInPlan.includes(name)) {
        notMatched.push(name);
      }
    }
    return notMatched;
  }

  // ---------------- What to show ----------------

  // 1. Still loading the trip
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

  // 2. The AI is working: show a loading message (SRS 5.1)
  if (aiWorking) {
    return (
      <div className="trip-layout">
        <Sidebar trip={trip} />

        <section className="trip-content">
          <Card p={50} ta="center">
            <Center mb="md"><Loader size="lg" type="dots" /></Center>
            <Title order={2}>{aiWorking === "day" ? "The AI is planning this day again..." : "The AI is planning your trip..."}</Title>
            <Text c="dimmed">It is reading everyone's preferences. This can take up to a minute.</Text>
          </Card>
        </section>
      </div>
    );
  }

  // 3. No itinerary yet
  if (!itinerary) {
    return (
      <div className="trip-layout">
        <Sidebar trip={trip} />

        <section className="trip-content">
          <Title order={1} mb="lg">Itinerary</Title>
          <Card p={40} ta="center">
            <Center mb="md">
              <ThemeIcon size={64} radius="xl" variant="light"><CalendarDays size={30} /></ThemeIcon>
            </Center>
            <Title order={2}>No itinerary yet</Title>

            {isOrganiser && (
              <div>
                <Text c="dimmed" mb="md">Make sure everyone has saved their preferences, then let the AI plan the trip.</Text>
                <Button size="md" onClick={handleGenerate}>Generate with AI</Button>
              </div>
            )}

            {!isOrganiser && (
              <Text c="dimmed">Save your preferences. The organiser will generate the itinerary once everyone is ready.</Text>
            )}

            {error && <Alert color="red" variant="light" mt="md" ta="left">{error}</Alert>}
          </Card>
        </section>
      </div>
    );
  }
  
  const isFinalised = itinerary.status === "finalised";
  const canEdit = isOrganiser && !isFinalised && trip.status === "planning";
  const openDecisions = countOpenDecisions();

  // Activity costs from the AI are PER PERSON.
  // The trip budget is for EVERYONE together, so multiply by the number of people.
  let costPerPerson = 0;
  for (let i = 0; i < itinerary.days.length; i++) {
    costPerPerson = costPerPerson + getTotalCost(itinerary.days[i].activities);
  }

  const numberOfPeople = trip.members.length;

  // The stay is priced per night for the whole group. A 3-day trip has 2 nights.
  let nights = itinerary.days.length - 1;
  if (nights < 0) {
    nights = 0;
  }
  let stayCost = 0;
  if (itinerary.stay && itinerary.stay.area) {
    stayCost = itinerary.stay.costPerNight * nights;
  }

  const costForEveryone = costPerPerson * numberOfPeople + stayCost;
  const overBudget = costForEveryone > trip.budget;

  // How much of the budget the plan uses, for the bar (0 to 100)
  let budgetPercent = 0;
  if (trip.budget > 0) {
    budgetPercent = Math.round((costForEveryone / trip.budget) * 100);
  }

  const day = itinerary.days[selectedDay];
  const dayWeather = getWeatherForDay(day.date);

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <Group justify="space-between" mb="lg">
          <Title order={1}>Itinerary</Title>
          {isFinalised && <Badge size="lg" color="green" leftSection={<Lock size={14} />}>Finalised</Badge>}
        </Group>

        {error && <Alert color="red" variant="light" mb="md">{error}</Alert>}

        {/* People who joined after the plan was made, and aren't in it yet */}
        {!isFinalised && membersNotInPlan.length > 0 && (
          <Alert color="orange" variant="light" mb="md" title={"Not in this plan yet: " + membersNotInPlan.join(", ")}>
            They have not saved preferences. They should fill in{" "}
            <Anchor component={Link} to={"/trips/" + tripId + "/preferences"}>My Preferences</Anchor>.
            {isOrganiser && " Then use \"Plan the whole trip again\" at the bottom so the plan includes them."}
          </Alert>
        )}

        {openDecisions > 0 && (
          <Alert color="yellow" variant="light" mb="md" title={openDecisions + " group decision(s) to make"}>
            The AI found things the group disagrees on.{" "}
            <Anchor component={Link} to={"/trips/" + tripId + "/consensus"} fw={700}>Go to Group Decisions →</Anchor>
          </Alert>
        )}

        {/* Cost summary: per person, stay, for everyone, and the trip budget */}
        <Card mb="lg">
          <SimpleGrid cols={{ base: 2, md: 4 }}>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Activities per person</Text>
              <Text fw={800} size="lg">{formatMoney(costPerPerson, currency)}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Stay · {nights} night{nights === 1 ? "" : "s"}</Text>
              <Text fw={800} size="lg">{formatMoney(stayCost, currency)}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total for {numberOfPeople} {numberOfPeople === 1 ? "person" : "people"}</Text>
              <Text fw={800} size="lg" c={overBudget ? "red" : "maroon.7"}>{formatMoney(costForEveryone, currency)}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Trip budget</Text>
              <Text fw={800} size="lg">{formatMoney(trip.budget, currency)}</Text>
            </div>
          </SimpleGrid>

          <Progress value={budgetPercent > 100 ? 100 : budgetPercent} color={overBudget ? "red" : "maroon"} size="lg" radius="xl" mt="md" />
          <Text size="sm" c="dimmed" mt={6}>The plan uses {budgetPercent}% of the trip budget.</Text>
        </Card>

        {overBudget && (
          <Alert color="red" variant="light" mb="lg" title="Over budget" icon={<Wallet size={18} />}>
            <Text size="sm" mb={canEdit ? "sm" : 0}>
              This plan costs about {formatMoney(costForEveryone, currency)}, which is{" "}
              {formatMoney(costForEveryone - trip.budget, currency)} more than the trip budget.
            </Text>
            {canEdit && (
              <Button color="red" onClick={() => handleMakeCheaper(costForEveryone)}>Make it cheaper with AI</Button>
            )}
            {!canEdit && !isFinalised && (
              <Text size="sm" c="dimmed">The organiser can ask the AI for a cheaper plan.</Text>
            )}
          </Alert>
        )}

        {/* Where to stay: the AI's suggestion (not a booking) */}
        {itinerary.stay && itinerary.stay.area && (
          <Card mb="lg">
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon size={52} radius="md" variant="light"><BedDouble size={26} /></ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Where to stay · suggestion, not a booking</Text>
                <Title order={3}><span className="capitalize">{itinerary.stay.placeType}</span> in {itinerary.stay.area}</Title>
                <Group gap="xs" my={6}>
                  <Badge variant="light" className="capitalize">{itinerary.stay.budgetLevel}</Badge>
                  <Text size="sm">
                    About <b>{formatMoney(itinerary.stay.costPerNight, currency)}</b> per night for the whole group
                  </Text>
                </Group>
                <Text size="sm" c="dimmed">{itinerary.stay.reason}</Text>
                {/* Only shown when the stay doesn't suit someone */}
                {getNotMatched(itinerary.stay.matchedMembers).length > 0 && (
                  <Badge color="orange" variant="light" mt="xs">
                    Doesn't match: {getNotMatched(itinerary.stay.matchedMembers).join(", ")}
                  </Badge>
                )}
              </div>
            </Group>
          </Card>
        )}

        {/* One tab per day */}
        <Tabs variant="pills" radius="xl" value={String(selectedDay)} onChange={(value) => setSelectedDay(Number(value))} mb="md">
          <Tabs.List>
            {itinerary.days.map((oneDay, index) => (
              <Tabs.Tab key={oneDay._id} value={String(index)}>Day {oneDay.dayNumber}</Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>

        <Card mb="lg">
          {/* The day's date, cost and weather */}
          <Group justify="space-between" mb="md">
            <div>
              <Title order={3}>Day {day.dayNumber} · {formatDate(day.date)}</Title>
              <Text size="sm" c="dimmed">About {formatMoney(getTotalCost(day.activities), currency)} per person</Text>
            </div>
            {dayWeather && (
              <Badge size="lg" variant="light" color="blue">
                {dayWeather.emoji} {dayWeather.label} · {dayWeather.maxTemp}° / {dayWeather.minTemp}°
              </Badge>
            )}
          </Group>

          {day.activities.length === 0 && <Text c="dimmed">No activities on this day.</Text>}

          {/* The day as a timeline: Morning, Afternoon, Evening */}
          {["Morning", "Afternoon", "Evening"].map((part) => {
            // The activities that belong to this part of the day (keeping their position in the day)
            const items = [];
            for (let i = 0; i < day.activities.length; i++) {
              if (getPartOfDay(day.activities[i].time) === part) {
                items.push({ activity: day.activities[i], index: i });
              }
            }

            if (items.length === 0) {
              return null;
            }

            return (
              <div key={part} className="day-part">
                <Text className="day-part-title">{part}</Text>

                <Timeline bulletSize={34} lineWidth={2} color="maroon" active={items.length - 1}>
                  {items.map((item) => {
                    const activity = item.activity;
                    const index = item.index;

                    return (
                      <Timeline.Item
                        key={activity._id}
                        bullet={<span className="timeline-emoji">{getActivityIcon(activity)}</span>}
                        lineVariant={activity.category === "travel" ? "dashed" : "solid"}
                      >
                        <Group justify="space-between" wrap="nowrap" align="flex-start">
                          <div>
                            <Group gap={8}>
                              <Badge variant="light" radius="sm">{activity.time}</Badge>
                              <Text fw={700}>{activity.name}</Text>
                            </Group>
                            <Text size="sm" c="dimmed" mt={4}>{activity.description}</Text>

                            {/* FR-5.6: only shown when this activity doesn't suit someone */}
                            {getNotMatched(activity.matchedMembers).length > 0 && (
                              <Badge color="orange" variant="light" size="sm" mt={6}>
                                Doesn't match: {getNotMatched(activity.matchedMembers).join(", ")}
                              </Badge>
                            )}
                          </div>

                          <Group gap={4} wrap="nowrap">
                            <Text fw={700} size="sm" c={activity.estimatedCost > 0 ? "dark" : "green"}>
                              {activity.estimatedCost > 0 ? formatMoney(activity.estimatedCost, currency) : "Free"}
                            </Text>

                            {/* Organiser only: the ⋮ menu with Edit / Earlier / Later / Remove */}
                            {canEdit && (
                              <Menu position="bottom-end" withinPortal>
                                <Menu.Target>
                                  <ActionIcon variant="subtle" color="gray" aria-label="Change this activity">
                                    <MoreVertical size={18} />
                                  </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                  <Menu.Item leftSection={<Pencil size={14} />} onClick={() => startEditing(activity)}>Edit</Menu.Item>
                                  <Menu.Item leftSection={<ArrowUp size={14} />} disabled={index === 0} onClick={() => handleMove(activity._id, "up")}>
                                    Move earlier
                                  </Menu.Item>
                                  <Menu.Item leftSection={<ArrowDown size={14} />} disabled={index === day.activities.length - 1} onClick={() => handleMove(activity._id, "down")}>
                                    Move later
                                  </Menu.Item>
                                  <Menu.Divider />
                                  <Menu.Item color="red" leftSection={<Trash2 size={14} />} onClick={() => handleRemove(activity)}>Remove</Menu.Item>
                                </Menu.Dropdown>
                              </Menu>
                            )}
                          </Group>
                        </Group>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              </div>
            );
          })}
        </Card>

        <Modal opened={editingId !== ""} onClose={() => setEditingId("")} title="Edit activity" centered>
          <form onSubmit={handleSaveEdit}>
            <Stack>
              <SimpleGrid cols={2}>
                <TextInput label="Time" placeholder="09:00" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                <NumberInput label={"Cost per person (" + currency + ")"} min={0} value={editCost} onChange={setEditCost} required />
              </SimpleGrid>
              <TextInput label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              <Textarea label="Description" autosize minRows={2} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setEditingId("")}>Cancel</Button>
                <Button type="submit">Save</Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {canEdit && (
          <Card mb="lg">
            <Group justify="space-between">
              <div>
                <Title order={3}>Happy with the plan?</Title>
                <Text size="sm" c="dimmed">
                  {openDecisions > 0 ? "Resolve all open group decisions first." : "Finalise it to lock it for everyone."}
                </Text>
              </div>
              <Button size="md" leftSection={<Lock size={16} />} onClick={handleFinalise} disabled={openDecisions > 0}>
                Finalise itinerary
              </Button>
            </Group>
          </Card>
        )}

        {canEdit && (
          <Accordion variant="separated" radius="lg">
            <Accordion.Item value="change">
              <Accordion.Control>Change the plan with AI</Accordion.Control>
              <Accordion.Panel>
                <Title order={4}>Plan Day {day.dayNumber} again</Title>
                <Text size="sm" c="dimmed" mb="xs">The AI re-plans only this day. The other days stay the same.</Text>
                <Group align="flex-end" wrap="nowrap" mb="lg">
                  <TextInput
                    style={{ flex: 1 }}
                    value={dayInstructions}
                    onChange={(e) => setDayInstructions(e.target.value)}
                    placeholder="Make this day less tiring"
                  />
                  <Button variant="light" leftSection={<RefreshCw size={16} />} onClick={() => handleRegenerateDay(day.dayNumber)}>
                    Plan Day {day.dayNumber} again
                  </Button>
                </Group>

                <Title order={4}>Plan the whole trip again</Title>
                <Text size="sm" c="dimmed" mb="xs">The AI makes a completely new plan. Group decisions start over.</Text>
                <Group align="flex-end" wrap="nowrap">
                  <TextInput
                    style={{ flex: 1 }}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="What should the AI change?"
                  />
                  <Button variant="light" leftSection={<RefreshCw size={16} />} onClick={handleGenerate}>Plan whole trip again</Button>
                </Group>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}
      </section>
    </div>
  );
}

export default ItineraryPage;
