# Developer Guide

This guide is for developers who want to run, modify, or deploy Golden Shelf Kids.

## Prerequisites

- **Python 3.8+** (standard library only; no pip dependencies for the site).
- **Node.js / npm** (only if deploying the Cloudflare Worker; install Wrangler).
- **git**.
- A modern browser.

## Getting started

```bash
git clone git@github.com:ShivrajRath/golden-shelf-kids.git
cd golden-shelf-kids

# Simplest: static server (no live library availability)
python3 -m http.server 8000
# open http://127.0.0.1:8000

# With live library availability
python3 serve.py
# open http://127.0.0.1:8000
```

## Architecture overview

Golden Shelf Kids is a **static site with a thin optional API**:

1. `index.html` is an Alpine.js SPA that fetches `data/books.json` and renders the collection, filters, and pagination client-side.
2. `generate_pages.py` produces one HTML file per book under `books/` plus `sitemap.xml`. Each book page is self-contained static HTML with SEO/OpenGraph tags.
3. `serve.py` (local) and `worker/index.js` (production) expose `/api/library-availability`, which queries library catalogs live. Book pages call this endpoint on load; if it's unavailable, they fall back to **Check** buttons.

There is no database and no build toolchain for the front end.

## Project structure

See `AGENTS.md` for the full layout table.

## Data model

`data/books.json` is a JSON array of 7,500 book objects. Required fields:

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | |
| `author` | string | |
| `isbn_13` | string | ISBN-13 (may be invalid/placeholder) |
| `publication_year` | number | |
| `page_count` | number | |
| `genres_tags` | string[] | Categories |
| `goodreads.rating` | number | 4.0+ |
| `goodreads.ratings_count` | number | 500+ |
| `summary.overview` | string | |
| `summary.key_takeaways` | string[] | |
| `one_sentence_hook` | string | |
| `cover_image_url` | string | Open Library cover URL |
| `cover_ol_id` | number | |
| `age_group` | string | `0-3`, `3-5`, `5-8`, `8-12`, `teen` |
| `fiction` | boolean | |
| `slug` | string | URL slug (optional; derived from title if absent) |
| `id` | string | Stable id |

## Generation pipeline

`generate_pages.py`:

- Reads `data/books.json`, `data/libraries.json`, `data/library-availability.json`.
- Renders each book page from an inline template (hero color per age group, library panel, SEO tags).
- Writes `books/<slug>.html` and `sitemap.xml`.
- Honors env vars: `SITE_URL` (default `https://novicelab.org/golden-shelf-kids`), `GSK_API_BASE` (bakes the API base into a `<meta name="gsk-api-base">` tag).

Run after any change to data or the generator:

```bash
python3 generate_pages.py
```

## Library availability system

See `LIBRARIES.md` for the full reference. Summary:

- Six libraries in `data/libraries.json` with `search_url` templates supporting `{query}`, `{isbn}`, `{title}`, `{author}`.
- Three catalogs support automated refresh (Frisco, Harris County via BiblioCommons; Plano via SirsiDynix). Three block automation (The Colony, Little Elm, Houston).
- Cache: `data/library-availability.json`, keyed by ISBN-13.
- Refresh script: `scripts/update_library_availability.py`.
- Live API: `serve.py` (local) and `worker/index.js` (production).

When adding or changing a library, update `data/libraries.json` **and** the hardcoded `LIBRARIES` array in `worker/index.js` (the Worker doesn't read the JSON file).

## Deploying the Cloudflare Worker

```bash
cd worker
npm install -g wrangler   # once
npx wrangler login
npx wrangler deploy
```

Then rebuild the site pointing at the Worker:

```bash
GSK_API_BASE=https://gsk-library-api.<subdomain>.workers.dev python3 generate_pages.py
# or with a custom route:
GSK_API_BASE=https://novicelab.org/gsk-api python3 generate_pages.py
git add -A && git commit -m "Point site at live library API" && git push
```

Test locally with `npx wrangler dev` and curl the local URL.

## Deploying the site

The site is a static host (GitHub Pages). Commit `index.html`, `data/`, `books/`, `sitemap.xml`, `favicon.svg`, and push to `main`. No build step is required on the host.

## Styling and UI

- Tailwind CSS via CDN (`https://cdn.tailwindcss.com`).
- Alpine.js 3 via CDN.
- Per-age-group color themes are defined in `index.html` (`themes` object) and mirrored in the generator for book pages.
- No component library; markup is inline.

## Adding or editing books

1. Edit `data/books.json` (append or modify records following the schema above).
2. Regenerate: `python3 generate_pages.py`.
3. Verify the new pages render and the collection count updated.
4. Commit and push.

## Troubleshooting

- **"Couldn't load the collection"** in the browser: ensure `data/books.json` is served (not opened via `file://`). Use an HTTP server.
- **Library panel shows only Check buttons in production**: expected on a static host; deploy the Worker and set `GSK_API_BASE`, then regenerate.
- **Stale availability numbers**: the site intentionally ships no cached numbers; if you see them, an old build is cached — hard-refresh.
- **Regeneration is slow**: 7,500 files; allow a minute or two.

## Contributing

- Open an issue or PR on GitHub.
- Keep changes focused; regenerate generated files in the same commit when templates or data change.
- Follow existing code style (Python: PEP 8-ish; JS: the existing functional style).
