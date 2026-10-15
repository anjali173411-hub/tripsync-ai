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

  try {
    const backupUrl =
      "https://geocoding-api.open-meteo.com/v1/search?count=1&name=" +
      encodeURIComponent(placeName);

    const backup = await getJson(backupUrl);

    if (backup.results && backup.results.length > 0) {
      const place = backup.results[0];
      return {
        lat: place.latitude,
        lon: place.longitude,
        fullName: place.name + ", " + place.country
      };
    }
  } catch (error) {
    console.warn("Open-Meteo place search failed, trying Photon:", error.message);
  }

  // Last try: Photon (OpenStreetMap data, works from cloud servers)
  const photon = await getJson(
    "https://photon.komoot.io/api/?limit=1&q=" + encodeURIComponent(placeName)
  );

  if (!photon.features || photon.features.length === 0) {
    return null;
  }

  const feature = photon.features[0];
  const nameParts = [feature.properties.name, feature.properties.state, feature.properties.country];
  return {
    lat: feature.geometry.coordinates[1],
    lon: feature.geometry.coordinates[0],
    fullName: nameParts.filter(Boolean).join(", ")
  };
}

function describeMetSymbol(symbol) {
  const code = String(symbol || "");
  if (code.includes("thunder")) return { label: "Thunderstorm", emoji: "⛈️" };
  if (code.includes("snow") || code.includes("sleet")) return { label: "Snow", emoji: "❄️" };
  if (code.includes("rainshowers")) return { label: "Rain showers", emoji: "🌦️" };
  if (code.includes("rain")) return { label: "Rain", emoji: "🌧️" };
  if (code.includes("fog")) return { label: "Foggy", emoji: "🌫️" };
  if (code.startsWith("cloudy")) return { label: "Cloudy", emoji: "☁️" };
  if (code.startsWith("partlycloudy") || code.startsWith("fair")) return { label: "Partly cloudy", emoji: "🌤️" };
  return { label: "Clear sky", emoji: "☀️" };
}

// Backup forecast from MET Norway (about 9 days ahead), used when Open-Meteo fails.
async function getMetNorwayForecast(place, startDate, endDate) {
  const url =
    "https://api.met.no/weatherapi/locationforecast/2.0/compact" +
    "?lat=" + Number(place.lat).toFixed(4) +
    "&lon=" + Number(place.lon).toFixed(4);

  const response = await fetch(url, {
    headers: { "User-Agent": "TripSyncAI/1.0 github.com/anjali173411-hub/tripsync-ai" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error("MET Norway answered with status " + response.status);
  }

  const data = await response.json();

  // MET Norway gives times in UTC; move them roughly to local time using the longitude.
  const offsetHours = Math.round(place.lon / 15);
  const firstDay = toDateText(new Date(startDate));
  const lastDay = toDateText(new Date(endDate));

  const byDate = {};
  const dates = [];

  for (let i = 0; i < data.properties.timeseries.length; i++) {
    const entry = data.properties.timeseries[i];
    const local = new Date(new Date(entry.time).getTime() + offsetHours * 60 * 60 * 1000);
    const date = toDateText(local);
    const hour = local.getUTCHours();

    if (date < firstDay || date > lastDay) {
      continue;
    }

    if (!byDate[date]) {
      byDate[date] = { min: null, max: null, rain: 0, symbol: "", symbolHourGap: 99 };
      dates.push(date);
    }
    const day = byDate[date];

    const temp = entry.data.instant.details.air_temperature;
    if (day.min === null || temp < day.min) day.min = temp;
    if (day.max === null || temp > day.max) day.max = temp;

    const next = entry.data.next_1_hours || entry.data.next_6_hours;
    if (next && next.details && typeof next.details.precipitation_amount === "number") {
      day.rain = day.rain + next.details.precipitation_amount;
    }

    // Use the weather symbol closest to midday for the whole day.
    const six = entry.data.next_6_hours || entry.data.next_1_hours;
    if (six && six.summary && Math.abs(hour - 12) < day.symbolHourGap) {
      day.symbol = six.summary.symbol_code;
      day.symbolHourGap = Math.abs(hour - 12);
    }
  }

  const days = [];
  for (let i = 0; i < dates.length; i++) {
    const day = byDate[dates[i]];
    const weather = describeMetSymbol(day.symbol);
    days.push({
      date: dates[i],
      label: weather.label,
      emoji: weather.emoji,
      maxTemp: Math.round(day.max),
      minTemp: Math.round(day.min),
      rain: Math.round(day.rain * 10) / 10 + " mm rain"
    });
  }

  return { type: "forecast", days: days };
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

  let data;
  try {
    data = await getJson(url);
  } catch (error) {
    console.warn("Open-Meteo weather failed:", error.message);

    // Open-Meteo sometimes refuses requests from shared cloud servers (like Render).
    // For trips in the next few days, use MET Norway instead.
    if (start <= addDays(today, 9) && end >= addDays(today, -1)) {
      const backup = await getMetNorwayForecast(place, start, end);
      if (backup.days.length > 0) {
        return backup;
      }
    }
    throw error;
  }

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
