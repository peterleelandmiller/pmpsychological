const { connectBlobContext, getArticles, noStoreHeaders, passwordMatches } = require("./article-service");

const FALLBACK_REFRESH_PASSWORD = "Warewolf14";

function parseBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch (error) {
    return {};
  }
}

exports.handler = async (event) => {
  connectBlobContext(event);

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: noStoreHeaders("manual-refresh-method-not-allowed"),
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  const body = parseBody(event);
  const configuredPassword = process.env.ARTICLE_REFRESH_PASSWORD || FALLBACK_REFRESH_PASSWORD;

  if (!passwordMatches(body.password, configuredPassword)) {
    return {
      statusCode: 401,
      headers: noStoreHeaders("manual-refresh-auth-failed"),
      body: JSON.stringify({ error: "Invalid password" })
    };
  }

  // The password is validated only on the server. On success, forceRefresh clears
  // transient cache state, bypasses existing cached article data, fetches the latest
  // source posts, and overwrites the persistent Blob cache with the fresh payload.
  return getArticles({ forceRefresh: true });
};
