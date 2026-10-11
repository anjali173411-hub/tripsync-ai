// Finds a photo of a place (e.g. "Goa") to show on the trip card.
// Uses Wikipedia's free API - no key needed.
//
//   1. Try the photo on the place's own Wikipedia page.
//   2. If that is missing or is a map/flag, search Wikipedia and take the first good photo
//      from a page whose title contains the place name (e.g. "Kashmir Valley").
//   3. If nothing is found, return "" and the card shows a coloured box instead.
//
// Returns null (not "") when Wikipedia could not be reached or is busy,
// so the app knows to try again later instead of saving "no photo".

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const IMAGE_WIDTH = 800; // big enough for a card, small enough to load fast
const TIMEOUT_MS = 8000;

// Wikipedia asks apps to say who they are
const HEADERS = { "User-Agent": "TripSyncAI/1.0 (student project; https://github.com/anjali173411-hub/tripsync-ai)" };

// Words that mean the picture is not a nice photo of the place
const NOT_A_PHOTO = ["map", "flag", "locator", "loc_", "marker", "seal", "emblem", "logo", "coat_of_arms", "svg"];

// true when the link is a normal photo (jpg) and not a map, flag or logo
function isGoodPhoto(link) {
  const lower = link.toLowerCase().split("?")[0];

  if (!lower.endsWith(".jpg") && !lower.endsWith(".jpeg")) {
    return false;
  }

  for (let i = 0; i < NOT_A_PHOTO.length; i++) {
    if (lower.includes(NOT_A_PHOTO[i])) {
      return false;
    }
  }
  return true;
}

// Asks Wikipedia and returns the list of pages in the reply.
// Returns [] when nothing was found, and null when Wikipedia could not be reached or is busy.
async function askWikipedia(params) {
  const url = WIKIPEDIA_API + "?" + new URLSearchParams(params).toString();

  try {
    const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.query || !data.query.pages) {
      return [];
    }

    // "pages" is an object like { "123": {...}, "456": {...} } - turn it into a list
    const pages = [];
    const ids = Object.keys(data.query.pages);
    for (let i = 0; i < ids.length; i++) {
      pages.push(data.query.pages[ids[i]]);
    }
    return pages;
  } catch (error) {
    return null;
  }
}

// The photo link of a Wikipedia page, or "" if it has none
function getPhotoLink(page) {
  if (page.thumbnail && page.thumbnail.source) {
    return page.thumbnail.source;
  }
  return "";
}

export async function findPlaceImage(placeName) {
  const name = placeName.trim();
  if (!name) {
    return "";
  }

  // 1. The place's own page, e.g. "Goa"
  const exactPages = await askWikipedia({
    action: "query",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: IMAGE_WIDTH,
    redirects: 1,
    format: "json",
    titles: name
  });
  if (exactPages === null) {
    return null;
  }

  for (let i = 0; i < exactPages.length; i++) {
    const link = getPhotoLink(exactPages[i]);
    if (link && isGoodPhoto(link)) {
      return link;
    }
  }

  // 2. Search, e.g. "Kashmir" -> "Kashmir Valley"
  const foundPages = await askWikipedia({
    action: "query",
    generator: "search",
    gsrsearch: name,
    gsrlimit: 8,
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: IMAGE_WIDTH,
    format: "json"
  });
  if (foundPages === null) {
    return null;
  }

  // Put the results in search order (best match first)
  foundPages.sort(function (a, b) {
    return a.index - b.index;
  });

  // The first word of the place name must be in the page title,
  // so "Manali" doesn't end up with a photo of a scooter
  const firstWord = name.toLowerCase().split(/[\s,]+/)[0];

  for (let i = 0; i < foundPages.length; i++) {
    const title = foundPages[i].title.toLowerCase();
    const link = getPhotoLink(foundPages[i]);

    if (title.includes(firstWord) && link && isGoodPhoto(link)) {
      return link;
    }
  }

  return "";
}
