// This file connects the frontend to the backend.
// Every page imports "api" from here to send requests.
// It also has a few small helper functions that many pages use.

import axios from "axios";

// Create one axios object that always talks to our backend.
// The backend address is written in the file frontend/.env
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

// This function runs before EVERY request we send.
// It adds our login token, so the backend knows who we are.
api.interceptors.request.use(function (config) {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }

  return config;
});

// This function runs after EVERY reply from the backend.
// If the backend says 401 (our login has expired), we log out
// and go back to the login page.
api.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    const loginExpired = error.response && error.response.status === 401;
    const wasLoggedIn = localStorage.getItem("token");

    if (loginExpired && wasLoggedIn) {
      logout();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;

// Gets the error message the backend sent, so we can show it on the page
export function getErrorMessage(error) {
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message;
  }

  return "Something went wrong. Please try again.";
}

// ---------- Login helpers ----------
// We keep the login token and user details in the browser's localStorage,
// so the user stays logged in even after refreshing the page.

export function saveLogin(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getCurrentUser() {
  const savedUser = localStorage.getItem("user");

  if (!savedUser) {
    return null;
  }

  return JSON.parse(savedUser);
}

// Forgets the login in this browser only
export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// Logs out properly (FR-1.6): the backend makes the token stop working,
// then we forget it in the browser too
export async function logoutEverywhere() {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    // Even if the backend can't be reached, still log out in this browser
  }
  logout();
}

// ---------- Formatting helpers ----------

// Turns a date into readable text, for example "12 Nov 2026"
export function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

// Turns a travel mode from the backend into text with an emoji, e.g. "train" -> "🚆 Train"
export function travelModeText(mode) {
  if (mode === "train") return "Train";
  if (mode === "bus") return "Bus";
  if (mode === "car") return "Car / bike";
  return "";
}

// Turns two dates into short text:
//   same month:      "12–15 November"
//   different month: "28 November – 2 December"
export function formatDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.toLocaleDateString(undefined, { month: "long" });
  const endMonth = end.toLocaleDateString(undefined, { month: "long" });

  if (startMonth === endMonth && start.getFullYear() === end.getFullYear()) {
    return start.getDate() + "–" + end.getDate() + " " + endMonth;
  }

  return start.getDate() + " " + startMonth + " – " + end.getDate() + " " + endMonth;
}

// Turns a number into money text with the currency symbol, for example "₹15,000"
// (the currency code, like "INR", comes from the backend .env)
export function formatMoney(amount, currency) {
  // The currency is loaded from the backend. Until it arrives, show just the number,
  // because toLocaleString crashes if the currency is empty.
  if (!currency) {
    return Number(amount).toLocaleString();
  }

  return Number(amount).toLocaleString(undefined, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0
  });
}
