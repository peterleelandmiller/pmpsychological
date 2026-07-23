# PM Psychological static rebuild

This is a production-ready static frontend using only HTML, CSS, and vanilla JavaScript.

## Architecture

- `index.html` is the homepage.
- `about/`, `contact/`, `emotional-overwhelm/`, and `mental-health-resources/` preserve the public Squarespace routes.
- `mental-health-resources/*/` contains individual article pages for the current public posts.
- `assets/css/styles.css` contains the complete design system, layout, responsive styles, and animation states.
- `assets/js/main.js` handles the preloader, mobile navigation, active nav state, loading buttons, scroll reveals, FAQs, and resources search/tag filtering.

## WordPress blog maintenance

The resources index and article detail shell use a WordPress site as the article source of truth through the Netlify `wordpress-posts` function. This lets Soro publish standard WordPress posts while the public frontend stays static and fast.

See [docs/CMS_ARTICLE_GUIDE.md](docs/CMS_ARTICLE_GUIDE.md) for the complete setup and publishing guide.

## Deployment

Deploy the repository to Netlify. No build command is required.
