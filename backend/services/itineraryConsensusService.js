
// Shared itinerary and consensus logic, used for BOTH solo and group trips.
//
// A solo trip is just a group with one member, so the same code works for both.
// For a group, the AI also looks for conflicts between members.
//
// The file has 4 parts:
//   PART 1. Prompts      - the text we send to the AI
//   PART 2. JSON shape   - the format the AI must reply in
//   PART 3. Checking     - making sure the AI's reply is correct (FR-4.6)
//   PART 4. Calling AI   - sending the request to Google Gemini
//
// The routes use three functions from here:
//   generateItinerary()     - the whole day-by-day plan, with group conflicts (FR-4.1, FR-5.1)
//   regenerateDay()         - plan one day again (FR-4.3)
//   getBudgetSuggestions()  - money-saving ideas when spending is near the budget (FR-7.4)
// All three use the same Gemini call and the same "check the reply, retry once" safety (FR-4.6).
// The API key comes from backend/.env (GEMINI_API_KEY) because it is a secret.

import { GoogleGenAI, ApiError } from "@google/genai";

// ---------- Settings ----------
export const CURRENCY = "INR";              // all money in the app is in this currency (SRS 8.1)
const GEMINI_MODEL = "gemini-flash-latest";             // main model: Google's newest Flash model
const GEMINI_BACKUP_MODEL = "gemini-flash-lite-latest"; // used when the main model's free daily limit is used up
const AI_TIMEOUT_MS = 60000;                // give up on one AI request after 60 seconds
const AI_MAX_ATTEMPTS = 2;                  // if the AI's answer is wrong, ask this many times in total
const AI_BUSY_TRIES = 3;                    // if Gemini is busy, try this many times in total
const AI_RETRY_DELAY_MS = 3000;             // wait 3 seconds, then 6 seconds, before trying again

// Our own error type for "the AI could not give a usable answer".
// The route catches it and shows the user a "please try again" message.
export class AIServiceError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details || [];
  }
}

// =====================================================================
// PART 1. PROMPTS - the text we send to the AI
// =====================================================================

// The general rules the AI must follow
const SYSTEM_PROMPT = `You are TripSync AI, a travel planner.
You plan day-by-day trip itineraries for one traveller or for a group of travellers.

Rules:
- Plan exactly the number of days you are asked for, numbered from 1.
- Plan a FULL day for every day, from morning to night (about 08:00 to 21:00), in time order.
  A normal day has: breakfast, a morning activity, lunch, an afternoon activity,
  an evening activity and dinner. Every activity has a time (e.g. "09:00"), a name,
  a short description (where it is and what they do), a category, and an estimated
  cost per person in the trip's currency.
- Use category "food" for every meal, "stay" for hotel check-in and check-out,
  "travel" for journeys, and a normal category (e.g. sightseeing, beach, culture,
  shopping, nightlife, relaxation) for everything else.
- Pace: "relaxed" means fewer sights and longer breaks, "packed" means more sights,
  but EVERY day still has breakfast, lunch and dinner (except meals before arriving
  on Day 1 or after leaving on the last day).
- Prefer activities that satisfy several travellers at once.
- For every activity, list in "matchedMembers" the names of the travellers whose
  interests or must-do items it satisfies. Use the names exactly as given.
- Never include anything that is on a traveller's deal-breaker list.
- The trip budget is the TOTAL for the whole group together (not per person).
  Activity costs are per person, so (all activity costs added up) x (number of travellers)
  must stay well within the trip budget, leaving money for travel, stay and food.
  If the budget is tight, choose free or cheap activities.
The journey (when you are told where they travel from and how: train, bus or car):
- Day 1 must START with the journey itself as an activity with category "travel",
  e.g. time "06:00", name "Train from Chennai to Goa", description "About 12 hours; arrive around 18:00".
  Use a realistic departure time and travel time for that distance and that kind of transport.
- Only plan activities on Day 1 AFTER the arrival time. Right after arriving, add
  "Check in at <the suggested stay>" (category "stay"). After a long journey keep Day 1 light,
  but still include dinner.
- The LAST day must END with the journey home as a "travel" activity, at a realistic time,
  so they get home at a sensible hour. Before it, add breakfast and
  "Check out from <the stay>" (category "stay"). Plan only what fits before leaving.
- The travel activity's estimatedCost is the ticket or fuel cost per person for that journey.
- With a car they can reach places further away; otherwise keep activities close together
  or use local transport.

Food:
- Every meal must suit every traveller's food preference (vegetarian, vegan, jain, non-vegetarian).
  For a mixed group choose places that serve all of them, and say so in the description.

Where to stay:
- In "stay", suggest ONE area and type of place for the whole group to stay, based on the
  travellers' stay budget (budget, mid-range, luxury) and stay type (hotel, homestay, hostel, resort).
  Give an estimated cost per night for the WHOLE group, a short reason, and in "matchedMembers"
  the travellers whose stay preference it matches. This is a suggestion only, not a booking.
- The stay cost (cost per night x nights) also comes out of the same trip budget.
- If travellers' stay preferences clash (e.g. one wants luxury, another budget), add a conflict
  with compromise options, like any other conflict.

Conflicts (group trips only):
- If two or more travellers want things that cannot both fit
  (for example one wants an adventure sport, another has it as a deal-breaker
  or has a budget too small for it), add an entry to "conflicts".
- Each conflict needs: a description, your reasoning, the names of the affected travellers,
  and 2 or 3 compromise options the group can vote on
  (e.g. an optional add-on for interested members only, splitting the day, or a cheaper alternative).
  Give each option an "extraCost" in the trip's currency (0 if it costs nothing extra).
- If there is only one traveller, or there are no real conflicts, return an empty "conflicts" array.`;

// Builds the message describing THIS trip and its travellers
function buildTripPrompt(trip, numberOfDays, members, instructions) {
  const currency = CURRENCY;

  let tripType = "group";
  if (members.length === 1) {
    tripType = "solo";
  }

  let prompt = "Plan a trip.\n\n";
  if (trip.startingFrom) {
    prompt += "Travelling from: " + trip.startingFrom + "\n";
  }
  if (trip.travelMode) {
    prompt += "Travelling by: " + trip.travelMode + "\n";
  }
  prompt += "Destination: " + trip.destination + "\n";
  prompt += "Number of days: " + numberOfDays + "\n";
  prompt += "Number of travellers: " + members.length + "\n";
  prompt += "Total budget for the whole group together: " + trip.budget + " " + currency + "\n";
  prompt += "Currency for all costs: " + currency + "\n";
  prompt += "Trip type: " + tripType + "\n\n";
  prompt += "Travellers:\n";

  // Add one block of text for each traveller
  for (let i = 0; i < members.length; i++) {
    const member = members[i];

    prompt += "- " + member.name + "\n";
    prompt += "  interests: " + listOrNone(member.interests) + "\n";
    prompt += "  other interests (typed by the traveller): " + listOrNone(member.otherInterests || []) + "\n";
    prompt += "  pace: " + member.pace + "\n";
    prompt += "  budget contribution: " + member.budgetContribution + " " + currency + "\n";
    prompt += "  must do: " + listOrNone(member.mustDo) + "\n";
    prompt += "  deal-breakers: " + listOrNone(member.dealBreakers) + "\n";
    prompt += "  notes: " + (member.freeTextNotes || "none") + "\n";
    prompt += "  food: " + (member.foodPreference || "no preference") + "\n";
    prompt += "  stay: " + (member.stayBudget || "mid-range") + " " + (member.stayType || "hotel") + "\n";
  }

  // Extra instructions when the organiser clicks "Regenerate" (FR-4.3)
  if (instructions) {
    prompt += "\nExtra instructions from the user: " + instructions;
  }

  return prompt;
}

// Turns ["food", "beaches"] into "food, beaches", or "none" if the list is empty
function listOrNone(list) {
  if (list.length === 0) {
    return "none";
  }
  return list.join(", ");
}

// Sent when the AI's answer had mistakes, so it can fix them
function buildRetryPrompt(errors) {
  let prompt = "Your previous answer had these problems:\n";

  for (let i = 0; i < errors.length; i++) {
    prompt += "- " + errors[i] + "\n";
  }

  prompt += "\nReturn the complete corrected answer as JSON.";
  return prompt;
}

// ---------- Prompt for planning ONE day again (FR-4.3) ----------

const DAY_PROMPT = `You are TripSync AI, a travel planner.
You are re-planning ONE day of an existing trip itinerary.
Follow the same rules as for a full plan:
- Plan a FULL day from morning to night (about 08:00 to 21:00), in time order:
  breakfast, morning activity, lunch, afternoon activity, evening activity, dinner.
  Every activity has a time (e.g. "09:00"), a name, a short description, a category
  ("food" for meals, "stay" for check-in/check-out, "travel" for journeys),
  and an estimated cost per person in the trip's currency.
- In "matchedMembers" list the travellers whose interests or must-do items each activity satisfies.
  Use the names exactly as given.
- Never include anything on a traveller's deal-breaker list.
- Do not repeat activities that are already planned on the other days.
- Every meal must suit every traveller's food preference.
- If this is Day 1, start with the journey there (category "travel") and only plan after arrival.
  If this is the last day, end with the journey home (category "travel") at a realistic time.
- Follow the user's instructions for this day.`;

function buildDayPrompt(trip, numberOfDays, members, otherDays, dayNumber, instructions) {
  let prompt = buildTripPrompt(trip, numberOfDays, members, "");

  prompt += "\n\nActivities already planned on the other days (do not repeat these):\n";
  for (let i = 0; i < otherDays.length; i++) {
    const names = [];
    for (let j = 0; j < otherDays[i].activities.length; j++) {
      names.push(otherDays[i].activities[j].name);
    }
    prompt += "- Day " + otherDays[i].dayNumber + ": " + listOrNone(names) + "\n";
  }

  prompt += "\nPlan ONLY Day " + dayNumber + " again.";
  if (instructions) {
    prompt += "\nInstructions for this day: " + instructions;
  }

  return prompt;
}

// ---------- Prompt for money-saving suggestions (FR-7.4) ----------

const BUDGET_PROMPT = `You are TripSync AI, a travel budget adviser.
A group's spending is close to (or over) their trip budget.
Suggest practical ways to save money for the rest of the trip, for example
cheaper alternatives to planned activities, a lower accommodation tier, or cheaper transport.
Give 3 to 5 suggestions. Each needs a short title, one or two sentences of detail,
and an estimated saving in the trip's currency for the whole group (a number, 0 if unsure).`;

function buildBudgetPrompt(trip, numberOfTravellers, totalSpent, spendingByCategory, plannedActivities) {
  const currency = CURRENCY;

  let prompt = "Trip to " + trip.destination + " for " + numberOfTravellers + " traveller(s).\n";
  prompt += "Total budget for the whole group: " + trip.budget + " " + currency + "\n";
  prompt += "Spent so far: " + totalSpent + " " + currency + "\n\n";

  prompt += "Spending by category:\n";
  for (let i = 0; i < spendingByCategory.length; i++) {
    prompt += "- " + spendingByCategory[i].name + ": " + spendingByCategory[i].amount + " " + currency + "\n";
  }

  prompt += "\nPlanned activities (cost per person):\n";
  if (plannedActivities.length === 0) {
    prompt += "- none planned yet\n";
  }
  for (let i = 0; i < plannedActivities.length; i++) {
    prompt += "- " + plannedActivities[i].name + ": " + plannedActivities[i].estimatedCost + " " + currency + "\n";
  }

  return prompt;
}

// =====================================================================
// PART 2. JSON SHAPE - the format the AI must reply in
//
// Example of a correct reply:
// {
//   "days": [
//     { "dayNumber": 1, "activities": [
//         { "time": "09:00", "name": "...", "description": "...", "category": "...",
//           "estimatedCost": 500, "matchedMembers": ["Asha"] } ] }
//   ],
//   "conflicts": [
//     { "description": "...", "reasoning": "...", "affectedMembers": ["Asha"],
//       "options": [ { "description": "...", "extraCost": 0 },
//                    { "description": "...", "extraCost": 800 } ] }
//   ]
// }
// =====================================================================

const ACTIVITY_SHAPE = {
  type: "object",
  properties: {
    time: { type: "string" },
    name: { type: "string" },
    description: { type: "string" },
    category: { type: "string" },
    estimatedCost: { type: "number" },
    matchedMembers: { type: "array", items: { type: "string" } }
  },
  required: ["time", "name", "description", "category", "estimatedCost", "matchedMembers"]
};

const DAY_SHAPE = {
  type: "object",
  properties: {
    dayNumber: { type: "integer" },
    activities: { type: "array", items: ACTIVITY_SHAPE }
  },
  required: ["dayNumber", "activities"]
};

const OPTION_SHAPE = {
  type: "object",
  properties: {
    description: { type: "string" },
    extraCost: { type: "number" }
  },
  required: ["description", "extraCost"]
};

const CONFLICT_SHAPE = {
  type: "object",
  properties: {
    description: { type: "string" },
    reasoning: { type: "string" },
    affectedMembers: { type: "array", items: { type: "string" } },
    options: { type: "array", items: OPTION_SHAPE }
  },
  required: ["description", "reasoning", "affectedMembers", "options"]
};

// The suggested place to stay
const STAY_SHAPE = {
  type: "object",
  properties: {
    area: { type: "string" },          // e.g. "Calangute, North Goa"
    placeType: { type: "string" },     // e.g. "homestay"
    budgetLevel: { type: "string" },   // e.g. "mid-range"
    costPerNight: { type: "number" },  // for the whole group
    reason: { type: "string" },
    matchedMembers: { type: "array", items: { type: "string" } }
  },
  required: ["area", "placeType", "budgetLevel", "costPerNight", "reason", "matchedMembers"]
};

const ITINERARY_SHAPE = {
  type: "object",
  properties: {
    days: { type: "array", items: DAY_SHAPE },
    stay: STAY_SHAPE,
    conflicts: { type: "array", items: CONFLICT_SHAPE }
  },
  required: ["days", "stay", "conflicts"]
};

// Reply for re-planning one day: { "activities": [ ... ] }
const ONE_DAY_SHAPE = {
  type: "object",
  properties: {
    activities: { type: "array", items: ACTIVITY_SHAPE }
  },
  required: ["activities"]
};

// Reply for money-saving ideas: { "suggestions": [ { "title", "detail", "estimatedSaving" } ] }
const SUGGESTIONS_SHAPE = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          estimatedSaving: { type: "number" }
        },
        required: ["title", "detail", "estimatedSaving"]
      }
    }
  },
  required: ["suggestions"]
};

// =====================================================================
// PART 3. CHECKING the AI's reply (FR-4.6: malformed AI output)
//
// We never trust the AI blindly. Its reply might:
//   - not be JSON at all
//   - be wrapped in ```json ... ``` marks
//   - have the wrong number of days
//   - mention people who are not on the trip
//   - give a conflict only 1 option, so there is nothing to vote on
// =====================================================================

// Removes ```json at the start and ``` at the end, if the AI added them
function removeCodeMarks(text) {
  let cleaned = text.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }

  return cleaned.trim();
}

function isFilledText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isValidCost(value) {
  return typeof value === "number" && value >= 0;
}

// Checks a list of activities and adds any problems to "errors"
function checkActivities(activities, dayLabel, memberNames, errors) {
  for (let a = 0; a < activities.length; a++) {
    const activity = activities[a];

    if (!isFilledText(activity.name)) {
      errors.push(dayLabel + " has an activity without a name");
    }

    if (!isValidCost(activity.estimatedCost)) {
      errors.push(dayLabel + ": \"" + activity.name + "\" has an invalid estimatedCost");
    }

    const matched = activity.matchedMembers || [];
    for (let m = 0; m < matched.length; m++) {
      if (!memberNames.includes(matched[m])) {
        errors.push(dayLabel + ": \"" + activity.name + "\" mentions unknown traveller \"" + matched[m] + "\"");
      }
    }
  }
}

// Turns the AI's text into JSON. Returns the data, or null if it is not valid JSON.
function readJson(replyText) {
  try {
    return JSON.parse(removeCodeMarks(replyText));
  } catch (error) {
    return null;
  }
}

// Checks the AI's reply for ONE re-planned day
export function checkDayReply(replyText, dayNumber, memberNames) {
  const data = readJson(replyText);

  if (!data || !Array.isArray(data.activities)) {
    return { ok: false, errors: ["The response must be JSON with an \"activities\" list"] };
  }

  const errors = [];

  if (data.activities.length === 0) {
    errors.push("Day " + dayNumber + " has no activities");
  }

  checkActivities(data.activities, "Day " + dayNumber, memberNames, errors);

  if (errors.length > 0) {
    return { ok: false, errors: errors };
  }

  return { ok: true, data: data };
}

// Checks the AI's money-saving suggestions
export function checkSuggestionsReply(replyText) {
  const data = readJson(replyText);

  if (!data || !Array.isArray(data.suggestions)) {
    return { ok: false, errors: ["The response must be JSON with a \"suggestions\" list"] };
  }

  const errors = [];

  if (data.suggestions.length === 0) {
    errors.push("Give at least one suggestion");
  }

  for (let i = 0; i < data.suggestions.length; i++) {
    const suggestion = data.suggestions[i];
    if (!isFilledText(suggestion.title) || !isFilledText(suggestion.detail)) {
      errors.push("Suggestion " + (i + 1) + " needs a title and a detail");
    }
    if (!isValidCost(suggestion.estimatedSaving)) {
      errors.push("Suggestion " + (i + 1) + " has an invalid estimatedSaving");
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors: errors };
  }

  return { ok: true, data: data };
}

// Checks the AI's reply.
// Returns { ok: true, data: theItinerary }
//      or { ok: false, errors: ["problem 1", "problem 2", ...] }
export function checkAIReply(replyText, numberOfDays, memberNames) {
  // Step 1: is the reply valid JSON?
  const data = readJson(replyText);

  if (!data) {
    return { ok: false, errors: ["The response was not valid JSON"] };
  }

  if (!Array.isArray(data.days) || !Array.isArray(data.conflicts)) {
    return { ok: false, errors: ["The response must have a \"days\" list and a \"conflicts\" list"] };
  }

  // Step 2: does the content make sense? Collect every problem we find.
  const errors = [];

  // Right number of days?
  if (data.days.length !== numberOfDays) {
    errors.push("Expected " + numberOfDays + " days but got " + data.days.length);
  }

  // Check each day
  for (let d = 0; d < data.days.length; d++) {
    const day = data.days[d];
    const dayLabel = "Day " + (d + 1);

    if (day.dayNumber !== d + 1) {
      errors.push(dayLabel + " has dayNumber " + day.dayNumber + ", expected " + (d + 1));
    }

    if (!Array.isArray(day.activities) || day.activities.length === 0) {
      errors.push(dayLabel + " has no activities");
      continue; // skip to the next day
    }

    checkActivities(day.activities, dayLabel, memberNames, errors);

    // A full day plan always includes meals
    let mealCount = 0;
    for (let a = 0; a < day.activities.length; a++) {
      if (day.activities[a].category === "food") {
        mealCount = mealCount + 1;
      }
    }
    if (mealCount === 0) {
      errors.push(dayLabel + " has no meals; add breakfast, lunch and dinner (category \"food\")");
    }
  }

  // The suggested place to stay
  const stay = data.stay;
  if (!stay || !isFilledText(stay.area) || !isFilledText(stay.placeType)) {
    errors.push("The response needs a \"stay\" with an area and a type of place");
  } else {
    if (!isValidCost(stay.costPerNight)) {
      errors.push("The stay has an invalid costPerNight");
    }
    const stayMatched = stay.matchedMembers || [];
    for (let m = 0; m < stayMatched.length; m++) {
      if (!memberNames.includes(stayMatched[m])) {
        errors.push("The stay mentions unknown traveller \"" + stayMatched[m] + "\"");
      }
    }
  }

  // A solo trip cannot have conflicts
  if (memberNames.length === 1 && data.conflicts.length > 0) {
    errors.push("A solo trip cannot have conflicts; return an empty conflicts list");
  }

  // Check each conflict
  for (let c = 0; c < data.conflicts.length; c++) {
    const conflict = data.conflicts[c];
    const conflictLabel = "Conflict " + (c + 1);

    if (!isFilledText(conflict.description)) {
      errors.push(conflictLabel + " has no description");
    }

    if (!Array.isArray(conflict.options) || conflict.options.length < 2) {
      errors.push(conflictLabel + " needs at least 2 options to vote on");
    } else {
      for (let o = 0; o < conflict.options.length; o++) {
        const option = conflict.options[o];
        if (!isFilledText(option.description) || !isValidCost(option.extraCost)) {
          errors.push(conflictLabel + " has an option with a missing description or invalid extraCost");
        }
      }
    }

    const affected = conflict.affectedMembers || [];
    for (let m = 0; m < affected.length; m++) {
      if (!memberNames.includes(affected[m])) {
        errors.push(conflictLabel + " mentions unknown traveller \"" + affected[m] + "\"");
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors: errors };
  }

  return { ok: true, data: data };
}

// =====================================================================
// PART 4. CALLING THE AI (Google Gemini)
// This is the only code that talks to Gemini. To use a different AI
// later, only this part needs to change.
// =====================================================================

// Waits for some milliseconds (used between retries)
function wait(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

// Sends the conversation to Gemini and returns its reply.
// systemPrompt: the rules for the AI
// shape:        the JSON format the reply must follow
// messages:     a list like [{ role: "user", text: "..." }, { role: "model", text: "..." }]
// Returns { text: "the reply", cutOff: true/false }
async function askGemini(systemPrompt, shape, messages) {
  if (!process.env.GEMINI_API_KEY) {
    throw new AIServiceError("GEMINI_API_KEY is not set in the .env file");
  }

  const gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { timeout: AI_TIMEOUT_MS }
  });

  // Put our messages into the format Gemini expects
  const contents = [];
  for (let i = 0; i < messages.length; i++) {
    contents.push({
      role: messages[i].role,
      parts: [{ text: messages[i].text }]
    });
  }

  // Each model has its own free daily limit. If the main one is used up, try the backup.
  const models = [GEMINI_MODEL, GEMINI_BACKUP_MODEL];
  let modelIndex = 0;
  let attempt = 1;
  let response = null;

  while (response === null) {
    try {
      response = await gemini.models.generateContent({
        model: models[modelIndex],
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",  // ask for JSON...
          responseJsonSchema: shape              // ...in exactly this shape
        }
      });
    } catch (error) {
      // The free Gemini plan allows a fixed number of requests per day, per model.
      const dailyLimitReached =
        error instanceof ApiError && error.status === 429 && String(error.message).includes("PerDay");

      if (dailyLimitReached) {
        // Is there another model left to try?
        if (modelIndex < models.length - 1) {
          console.warn(models[modelIndex] + " has used its free daily limit, switching to " + models[modelIndex + 1]);
          modelIndex = modelIndex + 1;
          attempt = 1;
          continue;
        }

        console.error("Gemini daily free limit reached on every model:", error.message);
        throw new AIServiceError(
          "The AI's free daily limit has been reached. Please try again later – it resets every day."
        );
      }

      // 429 = too many requests right now, 500+ = server problem. Both are usually temporary.
      const isTemporary = error instanceof ApiError && (error.status === 429 || error.status >= 500);

      if (isTemporary && attempt < AI_BUSY_TRIES) {
        console.warn("Gemini is busy (try " + attempt + "), trying again:", error.message);
        await wait(AI_RETRY_DELAY_MS * attempt);
        attempt = attempt + 1;
      } else {
        console.error("Gemini request failed:", error.message);
        throw new AIServiceError("The AI service is unavailable right now. Please try again.");
      }
    }
  }

  // Why did the AI stop writing?
  let finishReason = "";
  if (response.candidates && response.candidates.length > 0) {
    finishReason = response.candidates[0].finishReason;
  }

  if (finishReason === "SAFETY") {
    throw new AIServiceError("The AI declined this request. Try rewording your preferences.");
  }

  return {
    text: response.text || "",
    cutOff: finishReason === "MAX_TOKENS" // the reply was too long and got cut off
  };
}

// Asks the AI, checks the reply, and if it is wrong asks once more (FR-4.6).
// checkReply is a function that returns { ok, data } or { ok: false, errors }.
async function askUntilValid(systemPrompt, shape, firstPrompt, checkReply) {
  const messages = [{ role: "user", text: firstPrompt }];
  let lastErrors = [];

  for (let attempt = 1; attempt <= AI_MAX_ATTEMPTS; attempt++) {
    // 1. Ask the AI
    const reply = await askGemini(systemPrompt, shape, messages);

    // 2. Check the reply
    let result;
    if (reply.cutOff) {
      result = { ok: false, errors: ["The response was cut off before it finished"] };
    } else {
      result = checkReply(reply.text);
    }

    // 3. Good reply: we are done
    if (result.ok) {
      return result.data;
    }

    // 4. Bad reply: show the AI its answer and the problems, then loop and ask again
    lastErrors = result.errors;
    console.warn("AI try " + attempt + " gave a wrong answer:", result.errors);

    messages.push({ role: "model", text: reply.text || "(empty response)" });
    messages.push({ role: "user", text: buildRetryPrompt(result.errors) });
  }

  // Every try failed. The route will show an error and save nothing.
  throw new AIServiceError("The AI could not produce a valid answer. Please try again.", lastErrors);
}

// Makes the list of member names, used to check the AI's replies
function getMemberNames(members) {
  const names = [];
  for (let i = 0; i < members.length; i++) {
    names.push(members[i].name);
  }
  return names;
}

// =====================================================================
// MAIN FUNCTIONS - used by the routes
//
// members: a list like [{ name, interests, otherInterests, pace, budgetContribution,
//                         mustDo, dealBreakers, freeTextNotes }, ...]
// =====================================================================

// The whole itinerary. Returns { days: [...], conflicts: [...] }, already checked.
// Works out what a plan costs for the whole group:
// (all activity costs per person x number of travellers) + (stay per night x nights)
export function getPlanCost(plan, numberOfTravellers) {
  let costPerPerson = 0;
  for (let d = 0; d < plan.days.length; d++) {
    for (let a = 0; a < plan.days[d].activities.length; a++) {
      costPerPerson = costPerPerson + plan.days[d].activities[a].estimatedCost;
    }
  }

  let nights = plan.days.length - 1;
  if (nights < 0) {
    nights = 0;
  }

  let stayCost = 0;
  if (plan.stay) {
    stayCost = plan.stay.costPerNight * nights;
  }

  return Math.round(costPerPerson * numberOfTravellers + stayCost);
}

export async function generateItinerary(trip, numberOfDays, members, instructions) {
  const memberNames = getMemberNames(members);

  function checkReply(replyText) {
    return checkAIReply(replyText, numberOfDays, memberNames);
  }

  // 1. The normal plan
  const plan = await askUntilValid(
    SYSTEM_PROMPT,
    ITINERARY_SHAPE,
    buildTripPrompt(trip, numberOfDays, members, instructions),
    checkReply
  );

  // 2. Over budget? Ask once more for a cheaper version of the same trip
  const cost = getPlanCost(plan, members.length);
  if (cost <= trip.budget) {
    return plan;
  }

  console.warn("Plan costs " + cost + " but the budget is " + trip.budget + ", asking for a cheaper plan");

  const cheaperInstructions =
    (instructions ? instructions + "\n" : "") +
    "IMPORTANT: your first plan cost about " + cost + " " + CURRENCY + " for the whole group, " +
    "but the total budget is only " + trip.budget + " " + CURRENCY + ". Make a CHEAPER plan that fits " +
    "the budget: choose free or low-cost activities, cheaper places to eat, a budget stay and " +
    "cheaper local transport, while still giving everyone what they asked for as far as possible.";

  try {
    const cheaperPlan = await askUntilValid(
      SYSTEM_PROMPT,
      ITINERARY_SHAPE,
      buildTripPrompt(trip, numberOfDays, members, cheaperInstructions),
      checkReply
    );

    // Keep whichever plan is cheaper
    if (getPlanCost(cheaperPlan, members.length) < cost) {
      return cheaperPlan;
    }
  } catch (error) {
    // The cheaper attempt failed: keep the first plan (the page will show it is over budget)
    console.warn("Could not get a cheaper plan:", error.message);
  }

  return plan;
}

// Plans one day again (FR-4.3). Returns { activities: [...] }, already checked.
// otherDays: the days we keep, so the AI doesn't repeat their activities.
export async function regenerateDay(trip, numberOfDays, members, otherDays, dayNumber, instructions) {
  const memberNames = getMemberNames(members);

  return askUntilValid(
    DAY_PROMPT,
    ONE_DAY_SHAPE,
    buildDayPrompt(trip, numberOfDays, members, otherDays, dayNumber, instructions),
    function (replyText) {
      return checkDayReply(replyText, dayNumber, memberNames);
    }
  );
}

// Money-saving suggestions (FR-7.4). Returns { suggestions: [...] }, already checked.
// spendingByCategory: [{ name, amount }]   plannedActivities: [{ name, estimatedCost }]
export async function getBudgetSuggestions(trip, numberOfTravellers, totalSpent, spendingByCategory, plannedActivities) {
  return askUntilValid(
    BUDGET_PROMPT,
    SUGGESTIONS_SHAPE,
    buildBudgetPrompt(trip, numberOfTravellers, totalSpent, spendingByCategory, plannedActivities),
    checkSuggestionsReply
  );
}

// =====================================================================
// FILLING THE PREFERENCE FORM FROM A DESCRIPTION (FR-3.2)
//
// The traveller describes their trip in their own words, for example
// "I'm vegetarian, want a calm trip with beaches, no water sports".
// The AI turns that into the form's answers. Nothing is saved here:
// the page fills in the form and the traveller checks it and clicks Save.
// =====================================================================

const PREFERENCES_PROMPT = `You fill in a travel preference form from what a traveller wrote.
Only use what they actually said. Do not invent wishes they did not mention.
- interests: pick from the allowed list only. Tick the CLOSEST matching interest for
  anything related they mention, even if they used different words. For example:
  hiking, trekking, rafting or paragliding -> adventure; temples, forts or museums ->
  history and/or culture; street food or cafes -> food; clubs or parties -> nightlife;
  waterfalls, wildlife or hills -> nature; spa or lazy days -> relaxation;
  markets -> shopping; sunsets or sunrises -> beaches and/or nature (beaches if by the sea).
  Look at EVERYTHING they wrote, including must-do places and activities, and tick every
  interest it relates to (e.g. "must see the Meenakshi temple" -> culture and history,
  "sunrise at Tiger Hill" -> nature). Most descriptions should tick at least one interest.
  Use your judgement for anything else.
- otherInterests: specific things they mentioned that are worth keeping as written
  (e.g. "hiking", "street food"), as short phrases. These can overlap with ticked interests.
- mustDo: specific places or activities they really want (short phrases),
  e.g. "must see", "really want to", "can't miss", "have to try".
- dealBreakers: things they want to avoid (short phrases),
  e.g. "no ...", "hate ...", "scared of ...", "not into ...", "avoid ...", "allergic to ...".
- For pace, foodPreference, stayBudget and stayType, pick the CLOSEST allowed value for
  what they mean, even in different words. Use "" (empty) only if they gave no hint at all.
  Examples (use your judgement for anything else):
  pace: "chill", "lazy", "slow", "take it easy" -> relaxed;
        "see as much as possible", "fit in a lot", "busy days" -> packed; "a bit of both" -> balanced.
  foodPreference: "I don't eat meat", "veg only" -> vegetarian; "no meat, eggs or dairy" -> vegan;
        "no onion or garlic" -> jain; "I eat everything", "love seafood or chicken" -> non-vegetarian.
  stayBudget: "cheap", "backpacker", "low budget" -> budget; "5-star", "fancy", "premium" -> luxury;
        "comfortable", "nothing too fancy" -> mid-range.
  stayType: "dorm", "backpacker place" -> hostel; "with a local family", "home-like" -> homestay;
        "villa", "pool", "beach property", "all-inclusive" -> resort; otherwise a normal hotel -> hotel.
- budgetContribution: the amount of money they said they will put in, as a plain number
  ("10k" -> 10000, "1.5 lakh" -> 150000, "5 thousand" -> 5000), or 0 if not said.`;

// Builds the reply shape, using the allowed choices from the Preference model
function buildPreferencesShape(choices) {
  return {
    type: "object",
    properties: {
      interests: { type: "array", items: { type: "string", enum: choices.interests } },
      otherInterests: { type: "array", items: { type: "string" } },
      mustDo: { type: "array", items: { type: "string" } },
      dealBreakers: { type: "array", items: { type: "string" } },
      pace: { type: "string", enum: choices.paces.concat([""]) },
      foodPreference: { type: "string", enum: choices.foods.concat([""]) },
      stayBudget: { type: "string", enum: choices.stayBudgets.concat([""]) },
      stayType: { type: "string", enum: choices.stayTypes.concat([""]) },
      budgetContribution: { type: "number" }
    },
    required: [
      "interests", "otherInterests", "mustDo", "dealBreakers",
      "pace", "foodPreference", "stayBudget", "stayType", "budgetContribution"
    ]
  };
}

// Keeps only the list items that are allowed (or any text, if no list is given)
function cleanList(list, allowed) {
  const result = [];
  if (!Array.isArray(list)) {
    return result;
  }
  for (let i = 0; i < list.length; i++) {
    const item = String(list[i]).trim();
    if (item === "") {
      continue;
    }
    if (allowed && !allowed.includes(item)) {
      continue;
    }
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}

// Keeps one value only if it is allowed, otherwise ""
function cleanChoice(value, allowed) {
  if (allowed.includes(value)) {
    return value;
  }
  return "";
}

// choices: { interests, paces, foods, stayBudgets, stayTypes } (the allowed values)
// Returns the form answers, already cleaned.
export async function preferencesFromText(text, choices) {
  let prompt = "Allowed interests: " + choices.interests.join(", ") + "\n\n";
  prompt += "What the traveller wrote:\n\"" + text + "\"";

  const data = await askUntilValid(
    PREFERENCES_PROMPT,
    buildPreferencesShape(choices),
    prompt,
    function (replyText) {
      const reply = readJson(replyText);
      if (!reply || typeof reply !== "object") {
        return { ok: false, errors: ["The response was not valid JSON"] };
      }
      return { ok: true, data: reply };
    }
  );

  // Never trust the AI blindly: keep only allowed values (FR-4.6)
  let budget = Number(data.budgetContribution);
  if (!Number.isFinite(budget) || budget < 0) {
    budget = 0;
  }

  return {
    interests: cleanList(data.interests, choices.interests),
    otherInterests: cleanList(data.otherInterests, null),
    mustDo: cleanList(data.mustDo, null),
    dealBreakers: cleanList(data.dealBreakers, null),
    pace: cleanChoice(data.pace, choices.paces),
    foodPreference: cleanChoice(data.foodPreference, choices.foods),
    stayBudget: cleanChoice(data.stayBudget, choices.stayBudgets),
    stayType: cleanChoice(data.stayType, choices.stayTypes),
    budgetContribution: Math.round(budget)
  };
}
