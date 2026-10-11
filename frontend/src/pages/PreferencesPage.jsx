// The preference form each member fills in (FR-3.1, FR-3.2).
// The AI uses these answers to plan the itinerary.
// Built with Mantine components (Chip, SegmentedControl, TagsInput, Textarea ...).

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Title, Text, Textarea, TagsInput, NumberInput, Chip, SegmentedControl, Button, Group, Stack, Alert, Loader, Center } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Sparkles, Save, Wallet } from "lucide-react";
import api, { getErrorMessage } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";

function PreferencesPage() {
  const { tripId } = useParams();

  const [trip, setTrip] = useState(null);

  // Choices that come from the backend
  const [interestOptions, setInterestOptions] = useState([]);
  const [paceOptions, setPaceOptions] = useState([]);
  const [foodOptions, setFoodOptions] = useState([]);
  const [stayBudgets, setStayBudgets] = useState([]);
  const [stayTypes, setStayTypes] = useState([]);
  const [currency, setCurrency] = useState("");

  // What the user fills in
  const [interests, setInterests] = useState([]);           // ticked chips, e.g. ["beaches", "food"]
  const [otherInterests, setOtherInterests] = useState([]); // typed tags, e.g. ["scuba diving"]
  const [pace, setPace] = useState("");
  const [budgetContribution, setBudgetContribution] = useState("");
  const [mustDo, setMustDo] = useState([]);
  const [dealBreakers, setDealBreakers] = useState([]);
  const [freeTextNotes, setFreeTextNotes] = useState("");
  const [foodPreference, setFoodPreference] = useState("");
  const [stayBudget, setStayBudget] = useState("");
  const [stayType, setStayType] = useState("");

  // "Describe your trip" box: the AI fills in the form from this text (FR-3.2)
  const [description, setDescription] = useState("");
  const [filling, setFilling] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Runs when the page opens
  useEffect(() => {
    loadPage();
  }, [tripId]);

  async function loadPage() {
    try {
      // 1. The trip (for the sidebar)
      const tripResponse = await api.get("/trips/" + tripId);
      setTrip(tripResponse.data.trip);

      // 2. The choices for the form
      const optionsResponse = await api.get("/options");
      setInterestOptions(optionsResponse.data.interestOptions);
      setPaceOptions(optionsResponse.data.paceOptions);
      setFoodOptions(optionsResponse.data.foodOptions);
      setStayBudgets(optionsResponse.data.stayBudgets);
      setStayTypes(optionsResponse.data.stayTypes);
      setCurrency(optionsResponse.data.currency);

      // 3. What I saved before (if anything), to fill the form
      const prefResponse = await api.get("/trips/" + tripId + "/preferences/me");
      const saved = prefResponse.data.preference;

      if (saved) {
        setInterests(saved.interests);
        setOtherInterests(saved.otherInterests);
        setPace(saved.pace);
        setFoodPreference(saved.foodPreference);
        setStayBudget(saved.stayBudget);
        setStayType(saved.stayType);
        setBudgetContribution(saved.budgetContribution);
        setMustDo(saved.mustDo);
        setDealBreakers(saved.dealBreakers);
        setFreeTextNotes(saved.freeTextNotes);
      } else {
        // Nothing saved for this trip yet: start from my profile defaults (FR-1.4)
        const profileResponse = await api.get("/profile");
        const defaults = profileResponse.data.user.defaultPreferences;
        setInterests(defaults.interests);
        setPace(defaults.pace);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // The AI reads the description and fills in the form below. Nothing is saved yet.
  async function handleFillFromText() {
    setError("");
    setFilling(true);

    try {
      const response = await api.post("/trips/" + tripId + "/preferences/from-text", {
        text: description
      });
      const filled = response.data.preferences;

      setInterests(filled.interests);
      setOtherInterests(filled.otherInterests);
      setMustDo(filled.mustDo);
      setDealBreakers(filled.dealBreakers);

      // Only change these if the description mentioned them
      if (filled.pace) {
        setPace(filled.pace);
      }
      if (filled.foodPreference) {
        setFoodPreference(filled.foodPreference);
      }
      if (filled.stayBudget) {
        setStayBudget(filled.stayBudget);
      }
      if (filled.stayType) {
        setStayType(filled.stayType);
      }
      if (filled.budgetContribution > 0) {
        setBudgetContribution(filled.budgetContribution);
      }

      // Keep the description too, so the AI planner can read it
      setFreeTextNotes(description);

      notifications.show({
        title: "Form filled in ✨",
        message: "Check the answers below, change anything you like, then click Save.",
        color: "green"
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setFilling(false);
  }

  // Runs when the form is submitted
  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await api.put("/trips/" + tripId + "/preferences", {
        interests: interests,
        otherInterests: otherInterests,
        pace: pace,
        foodPreference: foodPreference || undefined,
        stayBudget: stayBudget || undefined,
        stayType: stayType || undefined,
        budgetContribution: Number(budgetContribution),
        mustDo: mustDo,
        dealBreakers: dealBreakers,
        freeTextNotes: freeTextNotes
      });
      notifications.show({ message: "Preferences saved ✓", color: "green" });
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setSaving(false);
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

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <Title order={1}>My Preferences</Title>
        <Text c="dimmed" mb="lg">
          Tell the AI what you want. You can change this until the organiser generates the itinerary.
        </Text>

        {/* The easy way: describe the trip, and the AI fills in the form */}
        <Card mb="lg" className="describe-card">
          <Title order={3}>✨ Describe your ideal trip</Title>
          <Text c="dimmed" size="sm" mb="sm">
            Write it like a message to a friend. The AI fills in the form below for you.
          </Text>
          <Textarea
            autosize
            minRows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="I'm vegetarian and want a relaxed trip with beaches and old churches. I must see Dudhsagar falls. No water sports. A cheap homestay is fine."
          />
          <Group mt="sm">
            <Button
              leftSection={<Sparkles size={16} />}
              loading={filling}
              disabled={description.trim().length < 10}
              onClick={handleFillFromText}
            >
              Fill in the form for me
            </Button>
          </Group>
        </Card>

        {error && <Alert color="red" variant="light" mb="md">{error}</Alert>}

        <Card>
          <form onSubmit={handleSave}>
            <Stack gap="lg">
              <div>
                <Title order={3}>Your answers</Title>
                <Text c="dimmed" size="sm">Fill these in yourself, or let the AI fill them in above. Then click Save.</Text>
              </div>

              <div>
                <Text fw={600} size="sm" mb={8}>What are you interested in? (pick any)</Text>
                {/* "multiple" lets you pick many chips; Mantine keeps the list in "interests" */}
                <Chip.Group multiple value={interests} onChange={setInterests}>
                  <Group gap="xs">
                    {interestOptions.map((interest) => (
                      <Chip key={interest} value={interest} className="capitalize">{interest}</Chip>
                    ))}
                  </Group>
                </Chip.Group>
              </div>

              <TagsInput
                label="Not in the list? Add your own interests"
                description="Type one and press Enter"
                placeholder="scuba diving, street art ..."
                value={otherInterests}
                onChange={setOtherInterests}
              />

              <div>
                <Text fw={600} size="sm" mb={8}>How busy should each day be?</Text>
                <SegmentedControl fullWidth data={paceOptions} value={pace} onChange={setPace} className="capitalize" />
              </div>

              <div>
                <Text fw={600} size="sm" mb={8}>What do you eat?</Text>
                <Chip.Group value={foodPreference} onChange={setFoodPreference}>
                  <Group gap="xs">
                    {foodOptions.map((option) => (
                      <Chip key={option} value={option} className="capitalize">{option}</Chip>
                    ))}
                  </Group>
                </Chip.Group>
              </div>

              <div>
                <Text fw={600} size="sm" mb={8}>Where would you like to stay?</Text>
                <SegmentedControl fullWidth data={stayBudgets} value={stayBudget} onChange={setStayBudget} className="capitalize" mb="xs" />
                <Chip.Group value={stayType} onChange={setStayType}>
                  <Group gap="xs">
                    {stayTypes.map((option) => (
                      <Chip key={option} value={option} className="capitalize">{option}</Chip>
                    ))}
                  </Group>
                </Chip.Group>
                <Text c="dimmed" size="xs" mt={6}>The AI suggests where the group should stay. It does not book anything.</Text>
              </div>

              <NumberInput
                label={"My budget contribution (" + currency + ")"}
                description="How much you plan to put into the trip"
                leftSection={<Wallet size={16} />}
                min={0}
                thousandSeparator=","
                value={budgetContribution}
                onChange={setBudgetContribution}
              />

              <TagsInput
                label="Must do"
                description="Places or activities you really want. Press Enter after each."
                placeholder="Dudhsagar falls"
                value={mustDo}
                onChange={setMustDo}
              />

              <TagsInput
                label="Deal-breakers"
                description="Things to avoid. Press Enter after each."
                placeholder="water sports"
                value={dealBreakers}
                onChange={setDealBreakers}
              />

              <Textarea
                label="Anything else?"
                description="Describe your ideal trip in your own words"
                autosize
                minRows={2}
                value={freeTextNotes}
                onChange={(e) => setFreeTextNotes(e.target.value)}
              />

              <Group justify="flex-end">
                <Button type="submit" size="md" loading={saving} leftSection={<Save size={16} />}>Save preferences</Button>
              </Group>
            </Stack>
          </form>
        </Card>
      </section>
    </div>
  );
}

export default PreferencesPage;
