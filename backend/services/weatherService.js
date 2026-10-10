
// Weather for a trip's destination and dates.
//
// Two free services are used (no API key needed):
//   1. OpenStreetMap (Nominatim) - turns a place name like "Goa" into a map position
//   2. Open-Meteo               - gives the weather for that map position
//
// Weather forecasts only go about 16 days ahead, so:
//   - trip within the next 16 days -> real FORECAST for each day
//   - trip already over            -> the ACTUAL weather on those days
//   - trip further in the future   -> TYPICAL weather (the same dates last year)

const FORECAST_DAYS = 16;        // how far ahead Open-Meteo can forecast
const REQUEST_TIMEOUT_MS = 10000; // give up on a weather request after 10 seconds

// Turns a weather code from Open-Meteo into words and an emoji
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

// Turns a Date into "2026-12-10"
function toDateText(date) {
  return date.toISOString().substring(0, 10);
}

// Adds (or subtracts) days from a date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Downloads JSON from a web address
async function getJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "TripSyncAI student project" }, // OpenStreetMap asks for this
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error("Weather service answered with status " + response.status);
  }

  return response.json();
}

// Finds the map position of a place name, e.g. "Goa" -> Goa, India
// Returns null if the place cannot be found.
export async function findPlace(placeName) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(placeName);

  const results = await getJson(url);

  if (results.length === 0) {
    return null;
  }

  return {
    lat: Number(results[0].lat),
    lon: Number(results[0].lon),
    fullName: results[0].display_name
  };
}

// Gets the weather for every day of the trip.
// "place" is { lat, lon }. Returns { type, days: [...] }
export async function getWeatherForDates(place, startDate, endDate) {
  const today = new Date();
  const lastForecastDay = addDays(today, FORECAST_DAYS - 1);
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Decide which kind of weather we can show
  let type = "typical";
  if (start >= addDays(today, -1) && end <= lastForecastDay) {
    type = "forecast";
  } else if (end < addDays(today, -5)) {
    type = "past"; // past weather data is ready about 5 days later
  }

  // For "typical", look at the same dates one year earlier
  let askStart = start;
  let askEnd = end;
  if (type === "typical") {
    askStart = addDays(start, -365);
    askEnd = addDays(end, -365);

    // A trip more than a year away: keep going back one more year
    // until the dates are in the past (past weather is ready about 5 days later)
    while (askEnd > addDays(today, -5)) {
      askStart = addDays(askStart, -365);
      askEnd = addDays(askEnd, -365);
    }
  }

  // The forecast service and the past-weather service have different addresses
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

  // Build one simple object per day of the trip
  const days = [];

  for (let i = 0; i < daily.time.length; i++) {
    // Sometimes a day has no data yet; skip it
    if (daily.weather_code[i] === null || daily.temperature_2m_max[i] === null) {
      continue;
    }

    const weather = describeWeather(daily.weather_code[i]);

    // Rain is a chance in % for forecasts, and millimetres of rain for past days
    let rain = "";
    if (type === "forecast") {
      rain = daily.precipitation_probability_max[i] + "% chance of rain";
    } else {
      rain = daily.precipitation_sum[i] + " mm rain";
    }

    days.push({
      date: toDateText(addDays(start, i)), // always the real trip date
      label: weather.label,
      emoji: weather.emoji,
      maxTemp: Math.round(daily.temperature_2m_max[i]),
      minTemp: Math.round(daily.temperature_2m_min[i]),
      rain: rain
    });
  }

  return { type: type, days: days };
}
