const FORECAST_DAYS = 16;
const REQUEST_TIMEOUT_MS = 10000;

function describeWeather(code) {
  if (code === 0) return { label: "Clear sky", emoji: "☀️" };
  if (code <= 2) return { label: "Partly cloudy", emoji: "🌤️" };
  if (code === 3) return { label: "Cloudy", emoji: "☁️" };
  if (code <= 48) return { label: "Foggy", emoji: "🌫️" };
  if (code <= 57) return { label: "Drizzle", emoji: "🌦️" };
  if (code <= 67) return { label: "Rain", emoji: "🌧️" };
  if (code <= 77) return { label: "Snow", emoji: "❄️" };
  if (code <= 82) return { label: "Rain showers", emoji: "🌦️" };
  if (code <= 86) return { label: "Snow showers", emoji: "🌨️" };
  return { label: "Thunderstorm", emoji: "⛈️" };
}

function toDateText(date) {
  return date.toISOString().substring(0, 10);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "TripSyncAI student project" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error("Weather service answered with status " + response.status);
  }

  return response.json();
}

export async function findPlace(placeName) {

  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=5&q=" +
      encodeURIComponent(placeName);

    const results = await getJson(url);

    const typed = placeName.trim().toLowerCase();
    let best = null;

    for (let i = 0; i < results.length; i++) {
      const name = String(results[i].name || "").toLowerCase();
      const nameMatches = name !== "" && (name.includes(typed) || typed.includes(name));

      if (nameMatches && (best === null || results[i].importance > best.importance)) {
        best = results[i];
      }
    }

    if (best === null && results.length > 0) {
      best = results[0];
    }

    if (best) {
      return {
        lat: Number(best.lat),
        lon: Number(best.lon),
        fullName: best.display_name
      };
    }
  } catch (error) {
    console.warn("OpenStreetMap place search failed, trying Open-Meteo:", error.message);
  }

  const backupUrl =
    "https://geocoding-api.open-meteo.com/v1/search?count=1&name=" +
    encodeURIComponent(placeName);

  const backup = await getJson(backupUrl);

  if (!backup.results || backup.results.length === 0) {
    return null;
  }

  const place = backup.results[0];
  return {
    lat: place.latitude,
    lon: place.longitude,
    fullName: place.name + ", " + place.country
  };
}

export async function getWeatherForDates(place, startDate, endDate) {
  const today = new Date();
  const lastForecastDay = addDays(today, FORECAST_DAYS - 1);
  const start = new Date(startDate);
  const end = new Date(endDate);

  let type = "typical";
  if (start >= addDays(today, -1) && end <= lastForecastDay) {
    type = "forecast";
  } else if (end < addDays(today, -5)) {
    type = "past";
  }

  let askStart = start;
  let askEnd = end;
  if (type === "typical") {
    askStart = addDays(start, -365);
    askEnd = addDays(end, -365);

    while (askEnd > addDays(today, -5)) {
      askStart = addDays(askStart, -365);
      askEnd = addDays(askEnd, -365);
    }
  }

  let url = "";
  if (type === "forecast") {
    url =
      "https://api.open-meteo.com/v1/forecast" +
      "?daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max";
  } else {
    url =
      "https://archive-api.open-meteo.com/v1/archive" +
      "?daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum";
  }

  url +=
    "&timezone=auto" +
    "&latitude=" + place.lat +
    "&longitude=" + place.lon +
    "&start_date=" + toDateText(askStart) +
    "&end_date=" + toDateText(askEnd);

  const data = await getJson(url);
  const daily = data.daily;

  const days = [];

  for (let i = 0; i < daily.time.length; i++) {

    if (daily.weather_code[i] === null || daily.temperature_2m_max[i] === null) {
      continue;
    }

    const weather = describeWeather(daily.weather_code[i]);

    let rain = "";
    if (type === "forecast") {
      rain = daily.precipitation_probability_max[i] + "% chance of rain";
    } else {
      rain = daily.precipitation_sum[i] + " mm rain";
    }

    days.push({
      date: toDateText(addDays(start, i)),
      label: weather.label,
      emoji: weather.emoji,
      maxTemp: Math.round(daily.temperature_2m_max[i]),
      minTemp: Math.round(daily.temperature_2m_min[i]),
      rain: rain
    });
  }

  return { type: type, days: days };
}
