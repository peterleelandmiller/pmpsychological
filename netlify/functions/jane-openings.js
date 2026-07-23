const JANE_BASE_URL = "https://petermillerpsychologicalservices.janeapp.com";
const JANE_BOOKING_URL = `${JANE_BASE_URL}/locations/peter-miller/book`;
const LOCATION_ID = 1;
const STAFF_MEMBER_ID = 1;
const NUM_DAYS = 7;
const CACHE_KEY = "availability";
const CACHE_FRESH_SECONDS = 300;
const CACHE_STALE_SECONDS = 86400;
const CDN_CACHE_SECONDS = 300;
const CDN_STALE_SECONDS = 900;

let memoryCache = null;
let blobCacheStatus = "not-checked";

function connectBlobContext(event) {
  try {
    require("@netlify/blobs").connectLambda(event);
    blobCacheStatus = "lambda-connected";
  } catch (error) {
    blobCacheStatus = `lambda-connect-error:${error.name || "Error"}`;
  }
}

const durations = [
  {
    minutes: 15,
    label: "15 min",
    description: "New client consultation.",
    options: [
      {
        id: 1,
        name: "New Client Consultation (Online)",
        shortName: "Online consultation",
        price: "Free",
        bookingUrl: `${JANE_BOOKING_URL}#/staff_member/1/treatment/1`
      },
      {
        id: 5,
        name: "New Client Consultation (Phone)",
        shortName: "Phone consultation",
        price: "Free",
        bookingUrl: `${JANE_BOOKING_URL}#/staff_member/1/treatment/5`
      }
    ]
  },
  {
    minutes: 60,
    label: "60 min",
    description: "Assessment or individual therapy.",
    options: [
      {
        id: 2,
        name: "Initial Assessment (Online)",
        shortName: "Online initial assessment",
        price: "$200",
        bookingUrl: `${JANE_BOOKING_URL}#/staff_member/1/treatment/2`
      },
      {
        id: 3,
        name: "Individual Therapy (Online)",
        shortName: "Online therapy",
        price: "$200",
        bookingUrl: `${JANE_BOOKING_URL}#/staff_member/1/treatment/3`
      },
      {
        id: 4,
        name: "Individual Therapy (Phone)",
        shortName: "Phone therapy",
        price: "$200",
        bookingUrl: `${JANE_BOOKING_URL}#/staff_member/1/treatment/4`
      }
    ]
  }
];

function janeOpeningsUrl(treatmentId) {
  const params = new URLSearchParams({
    location_id: String(LOCATION_ID),
    staff_member_id: String(STAFF_MEMBER_ID),
    treatment_id: String(treatmentId),
    date: "",
    num_days: String(NUM_DAYS)
  });
  return `${JANE_BASE_URL}/api/v2/openings?${params}`;
}

function getStore() {
  try {
    blobCacheStatus = "available";
    return require("@netlify/blobs").getStore("jane-openings");
  } catch (error) {
    blobCacheStatus = `unavailable-${error.name || "Error"}:${error.message || "unknown"}`;
    return null;
  }
}

function ageSeconds(savedAt) {
  const saved = new Date(savedAt).getTime();
  if (!saved) return Infinity;
  return (Date.now() - saved) / 1000;
}

function isUsableCache(entry, maxAgeSeconds) {
  return entry?.payload && ageSeconds(entry.savedAt) <= maxAgeSeconds;
}

function responseHeaders(source, cacheSeconds = CDN_CACHE_SECONDS) {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "Netlify-CDN-Cache-Control": `public, durable, s-maxage=${cacheSeconds}, stale-while-revalidate=${CDN_STALE_SECONDS}, stale-if-error=${CACHE_STALE_SECONDS}`,
    "X-Availability-Source": source,
    "X-Persistent-Cache": blobCacheStatus
  };
}

async function readCachedOpenings() {
  if (isUsableCache(memoryCache, CACHE_STALE_SECONDS)) {
    blobCacheStatus = "memory-hit";
    return memoryCache;
  }

  const store = getStore();
  if (!store) return null;

  try {
    const cached = await store.get(CACHE_KEY, { type: "json" });
    if (isUsableCache(cached, CACHE_STALE_SECONDS)) {
      memoryCache = cached;
      blobCacheStatus = "blob-hit";
      return cached;
    }
    blobCacheStatus = "blob-miss";
  } catch (error) {
    blobCacheStatus = "blob-read-error";
    return null;
  }

  return null;
}

async function writeCachedOpenings(payload) {
  const entry = {
    savedAt: new Date().toISOString(),
    payload
  };
  memoryCache = entry;

  const store = getStore();
  if (!store) return;

  try {
    await store.setJSON(CACHE_KEY, entry);
    blobCacheStatus = "blob-write-ok";
  } catch (error) {
    blobCacheStatus = "blob-write-error";
    // The CDN and memory cache still protect Jane if Blobs is unavailable.
  }
}

async function fetchTreatmentOpenings(option) {
  const response = await fetch(janeOpeningsUrl(option.id), {
    headers: {
      Accept: "application/json",
      "User-Agent": "pmpsychological.com booking availability"
    }
  });

  if (!response.ok) {
    throw new Error(`Jane returned ${response.status} for treatment ${option.id}`);
  }

  const staffDays = await response.json();
  const openings = Array.isArray(staffDays)
    ? staffDays.flatMap((staffDay) => Array.isArray(staffDay.openings) ? staffDay.openings : [])
    : [];

  return {
    ...option,
    firstDate: staffDays?.[0]?.first_date || null,
    openings: openings
      .filter((opening) => opening && opening.status === "opening" && opening.start_at)
      .map((opening) => ({
        treatmentId: option.id,
        startAt: opening.start_at,
        endAt: opening.end_at,
        duration: opening.duration
      }))
      .slice(0, 12)
  };
}

async function fetchJaneAvailability() {
  const populated = await Promise.all(durations.map(async (duration) => ({
    ...duration,
    options: await Promise.all(duration.options.map(fetchTreatmentOpenings))
  })));

  return {
    generatedAt: new Date().toISOString(),
    timezone: "America/Edmonton",
    bookingUrl: JANE_BOOKING_URL,
    durations: populated
  };
}

exports.handler = async (event) => {
  connectBlobContext(event);

  const cached = await readCachedOpenings();

  if (isUsableCache(cached, CACHE_FRESH_SECONDS)) {
    return {
      statusCode: 200,
      headers: responseHeaders("persistent-cache"),
      body: JSON.stringify({
        ...cached.payload,
        cache: {
          status: "fresh",
          persistent: blobCacheStatus,
          savedAt: cached.savedAt,
          ageSeconds: Math.round(ageSeconds(cached.savedAt))
        }
      })
    };
  }

  try {
    const payload = await fetchJaneAvailability();
    await writeCachedOpenings(payload);

    return {
      statusCode: 200,
      headers: responseHeaders("jane-live"),
      body: JSON.stringify({
        ...payload,
        cache: {
          status: "refreshed",
          persistent: blobCacheStatus,
          savedAt: payload.generatedAt,
          ageSeconds: 0
        }
      })
    };
  } catch (error) {
    if (isUsableCache(cached, CACHE_STALE_SECONDS)) {
      return {
        statusCode: 200,
        headers: responseHeaders("stale-persistent-cache", 60),
        body: JSON.stringify({
          ...cached.payload,
          cache: {
            status: "stale",
            persistent: blobCacheStatus,
            savedAt: cached.savedAt,
            ageSeconds: Math.round(ageSeconds(cached.savedAt))
          }
        })
      };
    }

    return {
      statusCode: 502,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Netlify-CDN-Cache-Control": "no-store"
      },
      body: JSON.stringify({ error: "Unable to load Jane availability right now." })
    };
  }
};
