# Repository Guidelines

## Project Structure & Module Organization
This single-page app is served from `index.html`, with global styling in `style.css`. JavaScript modules live in `js/`: `main.js` coordinates UI events, `api.js` wraps Open-Meteo requests, `ui.js` renders components, and helpers such as `storage.js`, `rainChart.js`, and `tempChart.js` cover persistence and visualization. Cloudflare Pages functions reside in `functions/api/` (`clothing-advice.js`, `rain-forecast.js`) and are the only code that should make secret-bearing API calls. Product notes, research, and prompt drafts belong in `docs/`; prefer new filenames like `docs/search-flow.md` so topics are scannable. Copy `config.example.js` to `config.js` when you need local overrides.

## Build, Test, and Development Commands
- `open index.html` — fastest way to validate layout-only tweaks in a browser.
- `npx http-server .` — serves the site with live reload-compatible headers; run from the repo root when testing geolocation, localStorage, or chart assets.
- `wrangler pages dev .` — runs the Cloudflare Pages emulator so `/api/*` functions work; populate `.dev.vars` with `OPENROUTER_API_KEY` and `RAINBOW_API_KEY` first.

## Coding Style & Naming Conventions
Use 4-space indentation, single quotes, and trailing commas in multiline literals to match existing files. Prefer descriptive camelCase for functions and variables (`displayWeatherComparison`), kebab-case for new Markdown docs, and keep module names aligned with the capability they expose. Keep DOM queries centralized in `ui.js`; container modules (like `main.js`) should orchestrate dependencies rather than performing direct DOM manipulation.

## Testing Guidelines
There is no automated suite yet, so record manual QA steps in `docs/qa-*.md`. Minimum smoke test: city search → relative comparison, location lookup → error handling, rain forecast → chart render, clothing advice → AI fallback. When adding automation, colocate browser tests in `tests/` (create it if needed) and name files `*.spec.js`. Mock external APIs; do not hard-code keys.

## Commit & Pull Request Guidelines
Commits follow a short, lower-case imperative style (e.g., `ui fixes`, `add two column layout`). Keep each commit focused on one concern. Pull requests should explain the user impact, list manual test steps, and attach before/after screenshots for UI changes. Link related docs or issues, and confirm that Cloudflare env vars and `config.js` diffs are redacted before review.
