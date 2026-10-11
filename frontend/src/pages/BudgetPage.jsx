// Budget tracking:
// - add expenses by category, optionally linked to an itinerary activity (FR-7.1)
// - see spent vs budget with a breakdown by category (FR-7.2)
// - see each member's contribution, what they paid and their fair share (FR-7.3)
// - ask the AI for money-saving tips when spending is near or over budget (FR-7.4)

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import api, { getErrorMessage, formatDate, formatMoney } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";
import NextStep from "../components/NextStep.jsx";

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
    } catch (err) {
      setError(getErrorMessage(err));
    }
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
      return <p className="error">{error}</p>;
    }
    return <p>Loading budget...</p>;
  }

  // How full the progress bar should be (0 to 100)
  let barWidth = budget.percentUsed;
  if (barWidth > 100) {
    barWidth = 100;
  }

  const totalsByCategory = getTotalsByCategory();
  const hasExpenses = budget.expenses.length > 0;

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <NextStep tripId={tripId} />
        <h1>Budget</h1>
        <p className="muted">
          Write down money you actually spend on this trip – hotel, food, tickets, taxis.
          Everyone in the trip can add what they paid. The page adds it all up so you can see
          how much of the trip budget is left and who has paid what.
        </p>

        {/* Summary with a progress bar */}
        <div className="card">
          <h2>{formatMoney(budget.totalSpent, currency)} spent of {formatMoney(budget.budget, currency)}</h2>
          <p className="muted small">Total trip budget for everyone. Every member's expenses count towards it.</p>

          <div className="progress">
            <div
              className={budget.overBudget ? "progress-fill over" : "progress-fill"}
              style={{ width: barWidth + "%" }}
            />
          </div>

          {budget.overBudget && (
            <p className="error">You are {formatMoney(-budget.remaining, currency)} over budget!</p>
          )}
          {!budget.overBudget && (
            <p className="muted">{formatMoney(budget.remaining, currency)} left ({budget.percentUsed}% used)</p>
          )}
        </div>

        {/* AI money-saving tips, once spending is near or over the budget (FR-7.4) */}
        {budget.canAskForSuggestions && (
          <div className="card notice">
            <h3><Lightbulb size={18} /> You have used {budget.percentUsed}% of the budget</h3>
            <p className="small">Ask the AI for ideas to spend less on the rest of the trip.</p>

            {loadingSuggestions && <div className="spinner" />}

            {!loadingSuggestions && suggestions.length === 0 && (
              <button onClick={handleGetSuggestions}>Get money-saving tips</button>
            )}

            {suggestions.map((suggestion, index) => (
              <div key={index} className="suggestion">
                <div className="row-between">
                  <strong>{suggestion.title}</strong>
                  {suggestion.estimatedSaving > 0 && (
                    <span className="tag tag-match">Save about {formatMoney(suggestion.estimatedSaving, currency)}</span>
                  )}
                </div>
                <p className="small">{suggestion.detail}</p>
              </div>
            ))}
          </div>
        )}

        {/* Spending by category (FR-7.2) */}
        {hasExpenses && (
          <div className="card">
            <h3>By category</h3>
            {totalsByCategory.map((item) => (
              <div key={item.name} className="bar-row">
                <span>{item.name}</span>
                <div className="progress small">
                  <div className="progress-fill" style={{ width: (item.amount / budget.totalSpent) * 100 + "%" }} />
                </div>
                <span>{formatMoney(item.amount, currency)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Each member's contribution and share (FR-7.3) */}
        {trip.type === "group" && (
          <div className="card">
            <h3>Who paid what</h3>
            <p className="muted small">
              "Fair share" is everything spent so far divided equally between the members.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Planned to put in</th>
                  <th>Paid so far</th>
                  <th>Fair share</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {budget.members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{formatMoney(member.contribution, currency)}</td>
                    <td>{formatMoney(member.paid, currency)}</td>
                    <td>{formatMoney(member.fairShare, currency)}</td>
                    <td>{getBalanceText(member.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add an expense (FR-7.1) */}
        <form className="card" onSubmit={handleAddExpense}>
          <h3>Add an expense</h3>

          <div className="two-columns">
            <div>
              <label>What did you pay for?</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hotel for 2 nights, Lunch, Taxi to airport"
                required
              />
            </div>
            <div>
              <label>Amount ({currency})</label>
              <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          </div>

          <div className="two-columns">
            <div>
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((oneCategory) => (
                  <option key={oneCategory} value={oneCategory}>{oneCategory}</option>
                ))}
              </select>
            </div>
            <div>
              <label>For which itinerary activity? (optional)</label>
              <select value={activityName} onChange={(e) => setActivityName(e.target.value)}>
                <option value="">Not linked to an activity</option>
                {activityNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <label>Notes (optional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />

          <button type="submit">Add expense</button>
          {error && <p className="error">{error}</p>}
        </form>

        {/* List of all expenses */}
        {hasExpenses && (
          <div className="card">
            <h3>All expenses</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>What</th>
                  <th>Category</th>
                  <th>Activity</th>
                  <th>Paid by</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {budget.expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>{formatDate(expense.expenseDate)}</td>
                    <td>{expense.title}</td>
                    <td>{expense.category}</td>
                    <td>{expense.activityName || "–"}</td>
                    <td>{expense.paidBy ? expense.paidBy.name : "Unknown"}</td>
                    <td>{formatMoney(expense.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default BudgetPage;
