import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import api, { getErrorMessage, formatDate, formatMoney } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";

function BudgetPage() {
  const { tripId } = useParams();

  const [trip, setTrip] = useState(null);
  const [budget, setBudget] = useState(null);
  const [categories, setCategories] = useState([]);
  const [currency, setCurrency] = useState("");
  const [activityNames, setActivityNames] = useState([]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [activityName, setActivityName] = useState("");

  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");

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
      setCategory(optionsResponse.data.expenseCategories[0]);

      await loadBudget();
    } catch (err) {
      setError(getErrorMessage(err));
    }

    try {
      const response = await api.get("/trips/" + tripId + "/itinerary");
      const names = [];
      for (let d = 0; d < response.data.itinerary.days.length; d++) {
        const day = response.data.itinerary.days[d];
        for (let a = 0; a < day.activities.length; a++) {
          names.push("Day " + day.dayNumber + ": " + day.activities[a].name);
        }
      }
      setActivityNames(names);
    } catch (err) {
      setActivityNames([]);
    }
  }

  async function loadBudget() {
    const response = await api.get("/trips/" + tripId + "/budget");
    setBudget(response.data);
  }

  async function handleAddExpense(event) {
    event.preventDefault();
    setError("");

    try {
      await api.post("/trips/" + tripId + "/expenses", {
        title: title,
        amount: Number(amount),
        category: category,
        activityName: activityName
      });
      setTitle("");
      setAmount("");
      setActivityName("");
      await loadBudget();
      notifications.show({ message: "Expense added", color: "green" });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleGetSuggestions() {
    try {
      const response = await api.post("/trips/" + tripId + "/budget/suggestions");
      setSuggestions(response.data.suggestions);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function getTotalsByCategory() {
    const totals = [];
    for (let i = 0; i < budget.expenses.length; i++) {
      const expense = budget.expenses[i];
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

  function getBalanceText(balance) {
    if (balance > 0) {
      return "Others owe " + formatMoney(balance, currency);
    }
    if (balance < 0) {
      return "Owes " + formatMoney(-balance, currency);
    }
    return "Settled";
  }

  if (!trip || !budget) {
    if (error) {
      return <p className="error-box">{error}</p>;
    }
    return <div className="center-box"><Loader /></div>;
  }

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <h1>Budget</h1>

        <div className="box">
          <p className="big-number">{formatMoney(budget.totalSpent, currency)}</p>
          <p className="muted">spent of {formatMoney(budget.budget, currency)} ({budget.percentUsed}%)</p>
          <div className="bar">
            <div className={budget.overBudget ? "bar-fill red" : "bar-fill"} style={{ width: Math.min(budget.percentUsed, 100) + "%" }} />
          </div>
          {budget.overBudget && <p className="red-text">{formatMoney(-budget.remaining, currency)} over budget!</p>}
          {!budget.overBudget && <p>{formatMoney(budget.remaining, currency)} left</p>}
        </div>

        {budget.canAskForSuggestions && (
          <div className="box">
            <h3>You have used {budget.percentUsed}% of the budget</h3>
            {suggestions.length === 0 && <button onClick={handleGetSuggestions}>Get money-saving tips</button>}
            {suggestions.map((suggestion, index) => (
              <div key={index} className="row">
                <div>
                  <b>{suggestion.title}</b>
                  <p className="muted small">{suggestion.detail}</p>
                </div>
                {suggestion.estimatedSaving > 0 && <span className="tag green">Save {formatMoney(suggestion.estimatedSaving, currency)}</span>}
              </div>
            ))}
          </div>
        )}

        <form className="box" onSubmit={handleAddExpense}>
          <h3>Add an expense</h3>
          <div className="two-columns">
            <div>
              <label>What did you pay for?</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hotel for 2 nights" required />
            </div>
            <div>
              <label>Amount ({currency})</label>
              <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((oneCategory) => <option key={oneCategory} value={oneCategory}>{oneCategory}</option>)}
              </select>
            </div>
            <div>
              <label>For which activity? (optional)</label>
              <select value={activityName} onChange={(e) => setActivityName(e.target.value)}>
                <option value="">Not linked</option>
                {activityNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="error-box">{error}</p>}
          <div className="button-row">
            <button type="submit">Add expense</button>
          </div>
        </form>

        {budget.expenses.length > 0 && (
          <div className="box">
            <h3>By category</h3>
            {getTotalsByCategory().map((item) => (
              <div key={item.name} className="row">
                <span className="capitalize">{item.name}</span>
                <b>{formatMoney(item.amount, currency)}</b>
              </div>
            ))}
          </div>
        )}

        {trip.type === "group" && (
          <div className="box scroll">
            <h3>Who paid what</h3>
            <table>
              <thead>
                <tr><th>Member</th><th>Paid</th><th>Fair share</th><th>Balance</th></tr>
              </thead>
              <tbody>
                {budget.members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{formatMoney(member.paid, currency)}</td>
                    <td>{formatMoney(member.fairShare, currency)}</td>
                    <td>{getBalanceText(member.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {budget.expenses.length > 0 && (
          <div className="box scroll">
            <h3>All expenses</h3>
            <table>
              <thead>
                <tr><th>Date</th><th>What</th><th>Category</th><th>Paid by</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {budget.expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>{formatDate(expense.expenseDate)}</td>
                    <td>{expense.title}</td>
                    <td className="capitalize">{expense.category}</td>
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
