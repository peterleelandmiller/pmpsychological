const crypto = require("crypto");

const DEFAULT_POST_URL_BASE = "/mental-health-resources";
const CACHE_KEY = "posts";
const CACHE_FRESH_SECONDS = 300;
const CACHE_STALE_SECONDS = 86400;
const CACHE_SECONDS = 300;
const STALE_SECONDS = 900;

let memoryCache = null;
let blobCacheStatus = "not-checked";

function headerSafe(value) {
  return String(value || "")
    .replace(/[^\t\x20-\x7e]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

function connectBlobContext(event) {
  try {
    require("@netlify/blobs").connectLambda(event);
    blobCacheStatus = "lambda-connected";
  } catch (error) {
    blobCacheStatus = `lambda-connect-error:${error.name || "Error"}`;
  }
}

function getStore() {
  try {
    blobCacheStatus = "available";
    return require("@netlify/blobs").getStore("wordpress-posts");
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
  return Array.isArray(entry?.payload?.items) && ageSeconds(entry.savedAt) <= maxAgeSeconds;
}

function responseHeaders(source, cacheSeconds = CACHE_SECONDS) {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "Netlify-CDN-Cache-Control": `public, durable, s-maxage=${cacheSeconds}, stale-while-revalidate=${STALE_SECONDS}, stale-if-error=${CACHE_STALE_SECONDS}`,
    "X-Article-Source": source,
    "X-Persistent-Cache": headerSafe(blobCacheStatus)
  };
}

function noStoreHeaders(source) {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, max-age=0",
    "Netlify-CDN-Cache-Control": "no-store",
    "X-Article-Source": source,
    "X-Persistent-Cache": headerSafe(blobCacheStatus)
  };
}

async function readCachedPosts() {
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

async function clearCachedPosts() {
  // Manual refresh intentionally bypasses in-memory and Blob cache before fetching.
  // The fresh payload is written back after WordPress responds, so normal
  // article requests keep using the fast persistent cache once refresh completes.
  memoryCache = null;
  const store = getStore();
  if (!store || typeof store.delete !== "function") return;

  try {
    await store.delete(CACHE_KEY);
    blobCacheStatus = "blob-delete-ok";
  } catch (error) {
    blobCacheStatus = "blob-delete-error";
  }
}

async function writeCachedPosts(payload) {
  const entry = {
    savedAt: new Date().toISOString(),
    payload
  };
  memoryCache = entry;

  const store = getStore();
  if (!store) return entry;

  try {
    await store.setJSON(CACHE_KEY, entry);
    blobCacheStatus = "blob-write-ok";
  } catch (error) {
    blobCacheStatus = "blob-write-error";
  }

  return entry;
}

function decodeEntities(value = "") {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function textFromHtml(html = "") {
  return decodeEntities(String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function normalizeSiteUrl(value = "") {
  return value.trim().replace(/\/+$/, "");
}

function wordpressApiBase(siteUrl) {
  if (siteUrl.includes("/wp-json/")) return siteUrl.replace(/\/posts\/?$/, "").replace(/\/+$/, "");
  return `${siteUrl}/wp-json/wp/v2`;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function wordpressApiBaseCandidates(siteUrl) {
  let originBase = "";
  let wordpressComSiteBase = "";
  const wordpressSiteId = process.env.WORDPRESS_SITE_ID;

  try {
    const parsed = new URL(siteUrl);
    originBase = `${parsed.origin}/wp-json/wp/v2`;
    wordpressComSiteBase = `https://public-api.wordpress.com/wp/v2/sites/${encodeURIComponent(wordpressSiteId || parsed.hostname)}`;
  } catch (error) {
    originBase = "";
  }

  return uniqueValues([
    wordpressApiBase(siteUrl),
    originBase,
    wordpressComSiteBase
  ]);
}

function localPostUrl(slug) {
  const base = (process.env.WORDPRESS_POST_URL_BASE || DEFAULT_POST_URL_BASE).replace(/\/+$/, "");
  return `${base}/${slug}/`;
}

function termNames(post, taxonomy) {
  const termGroups = post?._embedded?.["wp:term"] || [];
  return termGroups
    .flat()
    .filter((term) => term?.taxonomy === taxonomy && term.name)
    .map((term) => decodeEntities(term.name));
}

function featuredImage(post) {
  const media = post?._embedded?.["wp:featuredmedia"]?.[0];
  return media?.media_details?.sizes?.large?.source_url
    || media?.media_details?.sizes?.medium_large?.source_url
    || media?.source_url
    || "";
}

function mapPost(post) {
  const categories = termNames(post, "category");
  const tags = termNames(post, "post_tag");
  const displayTags = uniqueValues([...categories, ...tags]);

  return {
    title: textFromHtml(post.title?.rendered || ""),
    date: post.date ? new Date(post.date).toISOString().slice(0, 10) : "",
    author: post._embedded?.author?.[0]?.name || "Peter Miller",
    tags: displayTags.slice(0, 12),
    categories,
    postTags: tags,
    searchTags: [...categories, ...tags],
    excerpt: textFromHtml(post.excerpt?.rendered || post.content?.rendered || "").slice(0, 240),
    image: featuredImage(post),
    body: post.content?.rendered || "",
    seoDescription: textFromHtml(post.excerpt?.rendered || "").slice(0, 160),
    url: localPostUrl(post.slug),
    slug: post.slug
  };
}

function configuredSiteUrl() {
  return normalizeSiteUrl(process.env.WORDPRESS_SITE_URL || process.env.WORDPRESS_API_BASE_URL || "");
}

async function fetchLivePosts() {
  const siteUrl = configuredSiteUrl();

  if (!siteUrl) {
    const error = new Error("Missing WORDPRESS_SITE_URL");
    error.statusCode = 500;
    throw error;
  }

  const params = new URLSearchParams({
    per_page: process.env.WORDPRESS_POSTS_PER_PAGE || "100",
    status: "publish",
    orderby: "date",
    order: "desc",
    _embed: "1"
  });

  const errors = [];

  for (const apiBase of wordpressApiBaseCandidates(siteUrl)) {
    const requestParams = new URLSearchParams(params);

    if (process.env.WORDPRESS_CATEGORY_ID) {
      requestParams.set("categories", process.env.WORDPRESS_CATEGORY_ID);
    } else if (process.env.WORDPRESS_CATEGORY_SLUG) {
      const categoriesUrl = `${apiBase}/categories?slug=${encodeURIComponent(process.env.WORDPRESS_CATEGORY_SLUG)}`;
      const categoriesResponse = await fetch(categoriesUrl, { headers: { Accept: "application/json" } });
      if (categoriesResponse.ok) {
        const categories = await categoriesResponse.json();
        if (categories?.[0]?.id) requestParams.set("categories", String(categories[0].id));
      }
    }

    const url = `${apiBase}/posts?${requestParams}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Peter Miller Psychological Services WordPress article sync"
      }
    });

    if (!response.ok) {
      errors.push(`${response.status} from ${url}`);
      continue;
    }

    const posts = await response.json();

    return {
      items: Array.isArray(posts) ? posts.map(mapPost).filter((post) => post.title && post.slug) : []
    };
  }

  throw new Error(`Article source returned no usable posts endpoint. Tried: ${errors.join("; ")}`);
}

async function getArticles({ forceRefresh = false } = {}) {
  const cached = forceRefresh ? null : await readCachedPosts();

  if (!forceRefresh && isUsableCache(cached, CACHE_FRESH_SECONDS)) {
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
    if (forceRefresh) await clearCachedPosts();
    const payload = await fetchLivePosts();
    const entry = await writeCachedPosts(payload);

    return {
      statusCode: 200,
      headers: forceRefresh ? noStoreHeaders("manual-refresh") : responseHeaders("wordpress-live"),
      body: JSON.stringify({
        ...payload,
        cache: {
          status: forceRefresh ? "manual-refreshed" : "refreshed",
          persistent: blobCacheStatus,
          savedAt: entry.savedAt,
          ageSeconds: 0
        }
      })
    };
  } catch (error) {
    if (!forceRefresh && isUsableCache(cached, CACHE_STALE_SECONDS)) {
      return {
        statusCode: 200,
        headers: responseHeaders("stale-persistent-cache", 60),
        body: JSON.stringify({
          ...cached.payload,
          cache: {
            status: "stale",
            persistent: blobCacheStatus,
            savedAt: cached.savedAt,
            ageSeconds: Math.round(ageSeconds(cached.savedAt)),
            error: error.message
          }
        })
      };
    }

    return {
      statusCode: error.statusCode || 502,
      headers: forceRefresh ? noStoreHeaders("manual-refresh-error") : responseHeaders("wordpress-error", 60),
      body: JSON.stringify({
        error: forceRefresh ? "Article refresh failed" : "Article fetch failed",
        message: error.statusCode === 500 ? "Article source is not configured." : error.message
      })
    };
  }
}

function passwordMatches(providedPassword, storedPassword) {
  if (!providedPassword || !storedPassword) return false;

  const provided = Buffer.from(String(providedPassword));
  const stored = Buffer.from(String(storedPassword));
  if (provided.length !== stored.length) return false;
  return crypto.timingSafeEqual(provided, stored);
}

module.exports = {
  connectBlobContext,
  getArticles,
  noStoreHeaders,
  passwordMatches
};
