const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const IMAGE_WIDTH = 800;
const TIMEOUT_MS = 8000;

const HEADERS = { "User-Agent": "TripSyncAI/1.0 (student project; https://github.com/anjali173411-hub/tripsync-ai)" };

const NOT_A_PHOTO = ["map", "flag", "locator", "loc_", "marker", "seal", "emblem", "logo", "coat_of_arms", "svg"];

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

  foundPages.sort(function (a, b) {
    return a.index - b.index;
  });

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
