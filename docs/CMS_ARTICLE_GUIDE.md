# WordPress article management guide

## 1. Is article publishing fully managed from WordPress?

Yes. The public frontend keeps the existing `/mental-health-resources/` routes, but article data now comes from a WordPress backend through a Netlify Function.

- The resources listing loads published WordPress posts.
- Search and tag filtering use WordPress categories and tags.
- Article detail URLs are handled by the static `article.html` shell.
- Soro can publish standard WordPress posts into the backend.
- Drafts and scheduled posts stay hidden until WordPress marks them as published.

The frontend calls:

`/api/wordpress-posts`

Netlify rewrites that URL to:

`/.netlify/functions/wordpress-posts`

Admins can also trigger a manual cache-bypassing refresh from the resources page. The frontend calls:

`/api/refresh-articles`

Netlify rewrites that URL to:

`/.netlify/functions/refresh-articles`

## 2. Required WordPress settings

Keep these WordPress settings in place:

- The WordPress REST API must be publicly readable for published posts.
- Soro should publish posts into the intended blog category.
- Use WordPress tags for visible frontend filters when possible.
- Use WordPress categories when you want broader grouping.
- Add excerpts for polished listing summaries. If no excerpt exists, the frontend derives one from the post body.
- Add a featured image when possible so listing cards and article pages have strong visuals.

## 3. Required Netlify environment variables

Set these in Netlify, not in committed source:

- `WORDPRESS_SITE_URL`: required. The WordPress site URL, for example `https://blog.example.com`. If you paste a page URL by mistake, the function also tries the domain root REST API.
- `WORDPRESS_API_BASE_URL`: optional alternative to `WORDPRESS_SITE_URL`, for example `https://blog.example.com/wp-json/wp/v2` or `https://blog.example.com/wp-json/wp/v2/posts`.
- `WORDPRESS_SITE_ID`: optional. For WordPress.com-hosted sites, this can be the numeric WordPress.com site ID. If omitted, the function tries the WordPress.com public API using the site hostname.
- `WORDPRESS_POST_URL_BASE`: optional. Defaults to `/mental-health-resources`.
- `WORDPRESS_CATEGORY_ID`: optional. Restricts posts to a WordPress category ID.
- `WORDPRESS_CATEGORY_SLUG`: optional. Restricts posts to a WordPress category slug when `WORDPRESS_CATEGORY_ID` is not set.
- `WORDPRESS_POSTS_PER_PAGE`: optional. Defaults to `100`.
- `ARTICLE_REFRESH_PASSWORD`: required for manual article refresh. Store this only in Netlify environment variables; do not commit it to the repository.

Use different values per Netlify deploy context if production and development use different WordPress sites.

## 4. Required developer settings or code changes

No code changes are required for normal article publishing once the environment variables are set.

The developer-maintained pieces are:

- `netlify/functions/wordpress-posts.js`
  - Exposes the public article feed route.
- `netlify/functions/article-service.js`
  - Reads the WordPress URL from Netlify environment variables.
  - Fetches published posts from the WordPress REST API.
  - Normalizes WordPress posts into the article shape used by the frontend.
  - Manages in-memory and Netlify Blobs article caching.
- `netlify/functions/refresh-articles.js`
  - Validates `ARTICLE_REFRESH_PASSWORD` server-side.
  - Bypasses existing article caches, fetches fresh WordPress posts, and rebuilds the persistent cache.
- `assets/js/main.js`
  - Loads articles from `/api/wordpress-posts`.
  - Renders the resources listing and article detail shell.
  - Submits the admin refresh form to `/api/refresh-articles` and updates the article list without a full page reload.
- `netlify.toml`
  - Rewrites `/api/wordpress-posts` to the Netlify Function.
  - Rewrites `/api/refresh-articles` to the refresh Netlify Function.
  - Rewrites `/mental-health-resources/*` to `article.html` so new article URLs work without generated HTML files.

## 5. Soro workflow

1. Install and activate the Soro plugin in WordPress.
2. In WordPress, go to **Settings -> Soro** and copy the API key.
3. Paste the key into the Soro dashboard under the WordPress integration.
4. Configure Soro to publish into the intended WordPress category.
5. Recommended: set Soro to create **Draft** posts first.
6. Review the article for clinical accuracy, tone, sources, tags, category, excerpt, and featured image.
7. Publish the post in WordPress.
8. Visit `/mental-health-resources/` on the public frontend.

Published WordPress changes may take a few minutes to appear because the Netlify Function uses CDN caching.

To force an immediate sync, enter the admin refresh password on `/mental-health-resources/` and use **Refresh Articles**.

## 6. Caching and rate-limit protection

The WordPress article function uses three cache layers:

- Netlify CDN cache keeps successful responses fresh for about 5 minutes.
- In-memory function cache avoids repeat WordPress calls while the function instance is warm.
- Netlify Blobs stores the last successful article feed for up to 24 hours.

If WordPress is temporarily unavailable or rate-limited, the function serves the last successful cached feed when possible. The `/api/wordpress-posts` response includes a `cache` object and `X-Article-Source` header so you can see whether content came from WordPress live, fresh cache, or stale cache.

Manual refresh is intentionally different from normal loading: the refresh function uses no-store response headers, clears transient cache state, bypasses the existing article cache, fetches from WordPress, and writes the fresh payload back to Netlify Blobs for subsequent normal requests.

## 7. Limitations and caveats

- Article pages are still rendered client-side from WordPress data.
- For maximum SEO, a future build-time/static article generation step would be stronger than client-side rendering.
- The WordPress backend must stay online and publicly readable for articles to load.
- If the WordPress domain changes, update `WORDPRESS_SITE_URL` in Netlify.
- If Soro publishes to drafts, those drafts do not appear publicly until published.
- If no tags exist, the frontend uses categories as the visible filter labels.
