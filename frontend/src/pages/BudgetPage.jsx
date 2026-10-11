// Budget tracking:
// - add expenses by category, optionally linked to an itinerary activity (FR-7.1)
// - see spent vs budget with a breakdown by category (FR-7.2)
// - see each member's contribution, what they paid and their fair share (FR-7.3)
// - ask the AI for money-saving tips when spending is near or over budget (FR-7.4)
// Built with Mantine components (RingProgress, Table, Select, NumberInput ...).

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Card, Title, Text, Button, Badge, Group, Stack, SimpleGrid, Table, RingProgress, Progress,
  TextInput, NumberInput, Select, Alert, Loader, Center, Paper
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Lightbulb, Plus } from "lucide-react";
import api, { getErrorMessage, formatDate, formatMoney } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";

function BudgetPage() {
  const { tripId } = useParams();

  const [trip, setTrip] = useState(null);
  const [budget, setBudget] = useState(null); // budget, totalSpent, remaining, members, expenses...

  // Choices that come from the backend
  const [categories, setCategories] = useState([]);
  const [currency, setCurrency] = useState("");
  const [activityNames, setActivityNames] = useState([]); // itinerary activities to link to

  // The "Add an expense" form
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [activityName, setActivityName] = useState("");
  const [notes, setNotes] = useState("");

  // AI money-saving tips
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [saving, setSaving] = useState(false);
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
      setCategories(optionsResponse.data.expenseCategories);
      setCurrency(optionsResponse.data.currency);
      setCategory(optionsResponse.data.expenseCategories[0]); // first category by default

      await loadBudget();
    } catch (err) {
      setError(getErrorMessage(err));
    }

    loadActivityNames();
  }

  async function loadBudget() {
    const response = await api.get("/trips/" + tripId + "/budget");
    setBudget(response.data);
  }

  // The itinerary activities, so an expense can be linked to one (FR-7.1)
  async function loadActivityNames() {
    try {
      const response = await api.get("/trips/" + tripId + "/itinerary");
      const days = response.data.itinerary.days;

      const names = [];
      for (let d = 0; d < days.length; d++) {
        for (let a = 0; a < days[d].activities.length; a++) {
          names.push("Day " + days[d].dayNumber + ": " + days[d].activities[a].name);
        }
      }
      setActivityNames(names);
    } catch (err) {
      setActivityNames([]); // no itinerary yet, so nothing to link to
    }
  }

  // Runs when "Add expense" is submitted
  async function handleAddExpense(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await api.post("/trips/" + tripId + "/expenses", {
        title: title,
        amount: Number(amount),
        category: category,
        activityName: activityName,
        notes: notes
      });

      // Clear the form and reload the numbers
      setTitle("");
      setAmount("");
      setActivityName("");
      setNotes("");
      await loadBudget();
      notifications.show({ message: "Expense added ✓", color: "green" });
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setSaving(false);
  }

  // Ask the AI how to save money (FR-7.4)
  async function handleGetSuggestions() {
    setError("");
    setLoadingSuggestions(true);

    try {
      const response = await api.post("/trips/" + tripId + "/budget/suggestions");
      setSuggestions(response.data.suggestions);
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setLoadingSuggestions(false);
  }

  // Adds up spending per category.
  // Returns a list like: [{ name: "food", amount: 500 }, { name: "transport", amount: 300 }]
  function getTotalsByCategory() {
    const totals = [];

    for (let i = 0; i < budget.expenses.length; i++) {
      const expense = budget.expenses[i];

      // Is this category already in the list?
      let found = null;
      for (let j = 0; j < totals.length; j++) {
        if (totals[j].name === expense.category) {
          found = totals[j];
        }
      }

      if (found) {
        found.amount = found.amount + expense.amount;
      } else {
        totals.push({ name: expense.category, amount: expense.amount });
      }
    }

    return totals;
  }

  // Words for a member's balance: who owes whom
  function getBalanceText(balance) {
    if (balance > 0) {
      return "Others owe " + formatMoney(balance, currency);
    }
    if (balance < 0) {
      return "Owes " + formatMoney(-balance, currency);
    }
    return "Settled";
  }

  // ---------------- What to show ----------------

  if (!trip || !budget) {
    if (error) {
      return <Alert color="red" variant="light">{error}</Alert>;
    }
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  // How full the ring should be (0 to 100)
  let ringValue = budget.percentUsed;
  if (ringValue > 100) {
    ringValue = 100;
  }

  const totalsByCategory = getTotalsByCategory();
  const hasExpenses = budget.expenses.length > 0;

  // The choices for the two dropdowns
  const categoryChoices = [];
  for (let i = 0; i < categories.length; i++) {
    categoryChoices.push({ value: categories[i], label: categories[i].charAt(0).toUpperCase() + categories[i].substring(1) });
  }

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <Title order={1}>Budget</Title>
        <Text c="dimmed" mb="lg">
          Write down money you actually spend on this trip – hotel, food, tickets, taxis.
          Everyone in the trip can add what they paid, and everyone sees the same numbers.
        </Text>

        {/* Summary: a ring showing how much of the budget is used */}
        <Card mb="lg">
          <Group wrap="nowrap" gap="xl">
            <RingProgress
              size={130}
              thickness={14}
              roundCaps
              sections={[{ value: ringValue, color: budget.overBudget ? "red" : "maroon" }]}
              label={<Text ta="center" fw={800} size="xl">{budget.percentUsed}%</Text>}
            />
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Spent so far</Text>
              <Title order={2}>{formatMoney(budget.totalSpent, currency)}</Title>
              <Text c="dimmed">of {formatMoney(budget.budget, currency)} total trip budget (everyone together)</Text>
              {budget.overBudget && (
                <Badge color="red" size="lg" mt="xs">{formatMoney(-budget.remaining, currency)} over budget!</Badge>
              )}
              {!budget.overBudget && (
                <Badge color="green" variant="light" size="lg" mt="xs">{formatMoney(budget.remaining, currency)} left</Badge>
              )}
            </div>
          </Group>
        </Card>

        {/* AI money-saving tips, once spending is near or over the budget (FR-7.4) */}
        {budget.canAskForSuggestions && (
          <Alert color="yellow" variant="light" mb="lg" icon={<Lightbulb size={20} />}
            title={"You have used " + budget.percentUsed + "% of the budget"}>
            <Text size="sm" mb="sm">Ask the AI for ideas to spend less on the rest of the trip.</Text>

            {suggestions.length === 0 && (
              <Button color="yellow.8" loading={loadingSuggestions} leftSection={<Lightbulb size={16} />} onClick={handleGetSuggestions}>
                Get money-saving tips
              </Button>
            )}

            <Stack gap="xs">
              {suggestions.map((suggestion, index) => (
                <Paper key={index} p="sm" radius="md" withBorder>
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={700}>{suggestion.title}</Text>
                    {suggestion.estimatedSaving > 0 && (
                      <Badge color="green" variant="light">Save about {formatMoney(suggestion.estimatedSaving, currency)}</Badge>
                    )}
                  </Group>
                  <Text size="sm" c="dimmed">{suggestion.detail}</Text>
                </Paper>
              ))}
            </Stack>
          </Alert>
        )}

        {/* Add an expense (FR-7.1) */}
        <Card mb="lg">
          <Title order={3} mb="sm">Add an expense</Title>
          <form onSubmit={handleAddExpense}>
            <Stack>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label="What did you pay for?"
                  placeholder="Hotel for 2 nights"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <NumberInput
                  label={"Amount (" + currency + ")"}
                  min={1}
                  thousandSeparator=","
                  value={amount}
                  onChange={setAmount}
                  required
                />
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Select label="Category" data={categoryChoices} value={category} onChange={setCategory} allowDeselect={false} />
                <Select
                  label="For which itinerary activity? (optional)"
                  placeholder="Not linked to an activity"
                  data={activityNames}
                  value={activityName || null}
                  onChange={(value) => setActivityName(value || "")}
                  searchable
                  clearable
                />
              </SimpleGrid>

              <TextInput label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

              {error && <Alert color="red" variant="light">{error}</Alert>}

              <Group justify="flex-end">
                <Button type="submit" loading={saving} leftSection={<Plus size={16} />}>Add expense</Button>
              </Group>
            </Stack>
          </form>
        </Card>

        {/* Spending by category (FR-7.2) */}
        {hasExpenses && (
          <Card mb="lg">
            <Title order={3} mb="sm">By category</Title>
            <Stack gap="sm">
              {totalsByCategory.map((item) => (
                <div key={item.name}>
                  <Group justify="space-between" mb={4}>
                    <Text className="capitalize" fw={600}>{item.name}</Text>
                    <Text fw={700}>{formatMoney(item.amount, currency)}</Text>
                  </Group>
                  <Progress value={(item.amount / budget.totalSpent) * 100} size="lg" radius="xl" />
                </div>
              ))}
            </Stack>
          </Card>
        )}

        {/* Each member's contribution and share (FR-7.3) */}
        {trip.type === "group" && (
          <Card mb="lg">
            <Title order={3}>Who paid what</Title>
            <Text c="dimmed" size="sm" mb="sm">
              "Fair share" is everything spent so far divided equally between the members.
            </Text>
            <Table.ScrollContainer minWidth={560}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Member</Table.Th>
                    <Table.Th>Planned to put in</Table.Th>
                    <Table.Th>Paid so far</Table.Th>
                    <Table.Th>Fair share</Table.Th>
                    <Table.Th>Balance</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {budget.members.map((member) => (
                    <Table.Tr key={member.id}>
                      <Table.Td fw={600}>{member.name}</Table.Td>
                      <Table.Td>{formatMoney(member.contribution, currency)}</Table.Td>
                      <Table.Td>{formatMoney(member.paid, currency)}</Table.Td>
                      <Table.Td>{formatMoney(member.fairShare, currency)}</Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={member.balance > 0 ? "green" : member.balance < 0 ? "orange" : "gray"}>
                          {getBalanceText(member.balance)}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Card>
        )}

        {/* List of all expenses */}
        {hasExpenses && (
          <Card>
            <Title order={3} mb="sm">All expenses</Title>
            <Table.ScrollContainer minWidth={640}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>What</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Activity</Table.Th>
                    <Table.Th>Paid by</Table.Th>
                    <Table.Th>Amount</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {budget.expenses.map((expense) => (
                    <Table.Tr key={expense._id}>
                      <Table.Td>{formatDate(expense.expenseDate)}</Table.Td>
                      <Table.Td fw={600}>{expense.title}</Table.Td>
                      <Table.Td><Badge variant="light" className="capitalize">{expense.category}</Badge></Table.Td>
                      <Table.Td>{expense.activityName || "–"}</Table.Td>
                      <Table.Td>{expense.paidBy ? expense.paidBy.name : "Unknown"}</Table.Td>
                      <Table.Td fw={700}>{formatMoney(expense.amount, currency)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Card>
        )}
      </section>
    </div>
  );
}

export default BudgetPage;
