import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Chip, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import api, { getErrorMessage, formatDate, formatMoney } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";

// Short names shown on the category buttons
const CATEGORY_LABELS = {
  accommodation: "Stay",
  food: "Food",
  transport: "Travel",
  activities: "Activities",
  misc: "Other"
};

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category;
}

function BudgetPage() {
  const { tripId } = useParams();

  const [trip, setTrip] = useState(null);
  const [budget, setBudget] = useState(null);
  const [categories, setCategories] = useState([]);
  const [currency, setCurrency] = useState("");

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  const [suggestions, setSuggestions] = useState([]);
  const [adding, setAdding] = useState(false);
  const addingNow = useRef(false);
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
  }

  async function loadBudget() {
    const response = await api.get("/trips/" + tripId + "/budget");
    setBudget(response.data);
  }

  async function handleAddExpense(event) {
    event.preventDefault();
    // A ref changes at once, so a quick second click is ignored even before the page redraws.
    if (addingNow.current) {
      return;
    }
    addingNow.current = true;
    setAdding(true);
    setError("");

    try {
      await api.post("/trips/" + tripId + "/expenses", {
        title: categoryLabel(category),
        amount: Number(amount),
        category: category
      });
      setAmount("");
      await loadBudget();
      notifications.show({ message: "Expense added", color: "green" });
    } catch (err) {
      setError(getErrorMessage(err));
    }
    addingNow.current = false;
    setAdding(false);
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
          <h3>Add what you paid</h3>
          <label>Amount ({currency})</label>
          <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1500" required />

          <label>For</label>
          <Chip.Group value={category} onChange={setCategory}>
            <div className="chip-list">
              {categories.map((oneCategory) => (
                <Chip key={oneCategory} value={oneCategory}>{categoryLabel(oneCategory)}</Chip>
              ))}
            </div>
          </Chip.Group>

          {error && <p className="error-box">{error}</p>}
          <div className="button-row">
            <button type="submit" disabled={adding}>{adding ? "Saving..." : "Add"}</button>
          </div>
        </form>

        {budget.expenses.length > 0 && (
          <div className="box">
            <h3>By category</h3>
            {getTotalsByCategory().map((item) => (
              <div key={item.name} className="row">
                <span>{categoryLabel(item.name)}</span>
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
                <tr><th>Date</th><th>Paid by</th><th>For</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {budget.expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>{formatDate(expense.expenseDate)}</td>
                    <td>{expense.paidBy ? expense.paidBy.name : "Unknown"}</td>
                    <td>{categoryLabel(expense.category)}</td>
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
