import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api"
});

api.interceptors.request.use(function (config) {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }

  return config;
});

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

export function getErrorMessage(error) {
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message;
  }

  return "Something went wrong. Please try again.";
}

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

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export async function logoutEverywhere() {
  try {
    await api.post("/auth/logout");
  } catch (error) {
  }
  logout();
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function travelModeText(mode) {
  if (mode === "train") return "Train";
  if (mode === "bus") return "Bus";
  if (mode === "car") return "Car / bike";
  return "";
}

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

export function formatMoney(amount, currency) {
  if (!currency) {
    return Number(amount).toLocaleString();
  }

  return Number(amount).toLocaleString(undefined, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0
  });
}
