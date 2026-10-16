import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Chip, Loader, Modal } from "@mantine/core";
import { Pencil, Trash2 } from "lucide-react";
import { notifications } from "@mantine/notifications";
import api, { getErrorMessage, getCurrentUser, formatDate, formatMoney } from "../api/axios.js";
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
  const user = getCurrentUser();

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

  const [editing, setEditing] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");

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

  function startEditing(expense) {
    setEditing(expense);
    setEditAmount(expense.amount);
    setEditCategory(expense.category);
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    setError("");
    try {
      // New-style expenses are titled by their category, so keep the title in step.
      const title = editing.title === categoryLabel(editing.category) ? categoryLabel(editCategory) : undefined;
      await api.put("/trips/" + tripId + "/expenses/" + editing._id, {
        amount: Number(editAmount),
        category: editCategory,
        title: title
      });
      setEditing(null);
      setSuggestions([]);
      await loadBudget();
      notifications.show({ message: "Expense updated", color: "green" });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete(expense) {
    if (!window.confirm("Remove this " + formatMoney(expense.amount, currency) + " expense?")) {
      return;
    }
    setError("");
    try {
      await api.delete("/trips/" + tripId + "/expenses/" + expense._id);
      setSuggestions([]);
      await loadBudget();
      notifications.show({ message: "Expense removed", color: "green" });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function canChange(expense) {
    if (trip.status === "completed" || trip.status === "archived") {
      return false;
    }
    const paidById = expense.paidBy ? expense.paidBy._id : "";
    return paidById === user.id || trip.organiser._id === user.id;
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
                <tr><th>Member</th><th>Paid</th></tr>
              </thead>
              <tbody>
                {budget.members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{formatMoney(member.paid, currency)}</td>
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
                <tr><th>Date</th><th>Paid by</th><th>For</th><th>Amount</th><th></th></tr>
              </thead>
              <tbody>
                {budget.expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>{formatDate(expense.expenseDate)}</td>
                    <td>{expense.paidBy ? expense.paidBy.name : "Unknown"}</td>
                    <td>{categoryLabel(expense.category)}</td>
                    <td>{formatMoney(expense.amount, currency)}</td>
                    <td>
                      {canChange(expense) && (
                        <div className="activity-icons">
                          <button className="icon-btn" title="Edit" onClick={() => startEditing(expense)}>
                            <Pencil size={16} />
                          </button>
                          <button className="icon-btn delete" title="Remove" onClick={() => handleDelete(expense)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Modal opened={editing !== null} onClose={() => setEditing(null)} title="Edit expense">
          <form onSubmit={handleSaveEdit} className="edit-form">
            <label>Amount ({currency})</label>
            <input type="number" min="1" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} required />

            <label>For</label>
            <Chip.Group value={editCategory} onChange={setEditCategory}>
              <div className="chip-list">
                {categories.map((oneCategory) => (
                  <Chip key={oneCategory} value={oneCategory}>{categoryLabel(oneCategory)}</Chip>
                ))}
              </div>
            </Chip.Group>

            <button type="submit">Save</button>
          </form>
        </Modal>
      </section>
    </div>
  );
}

export default BudgetPage;
