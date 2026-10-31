# AGENTS.md

Guidance for AI coding agents working in the **Golden Shelf Kids** repository.

## Project summary

Golden Shelf Kids is a static website: a curated, searchable library of 7,500+ age-appropriate books for children and teens. There is no application framework or build step for the front end — it's plain HTML + Tailwind (CDN) + Alpine.js, plus a Python generator that renders 7,500 per-book pages and a sitemap. An optional Cloudflare Worker (and a local `serve.py`) provide live library availability.

## Repository layout

| Path | Purpose |
| --- | --- |
| `index.html` | Main SPA shell (Alpine.js). Loads `data/books.json`. |
| `books/*.html` | Generated per-book pages (7,500). Do not hand-edit. |
| `data/books.json` | Source book data (7,500 records). |
| `data/libraries.json` | Six library systems + search URL templates. |
| `data/library-availability.json` | Optional cached availability per ISBN. |
| `generate_pages.py` | Renders `books/*.html` and `sitemap.xml`. |
| `serve.py` | Local HTTP server with live `/api/library-availability`. |
| `scripts/update_library_availability.py` | Refreshes the availability cache. |
| `worker/index.js` | Cloudflare Worker (production live API). |
| `worker/wrangler.toml` | Worker config (`gsk-library-api`). |
| `worker/README.md` | Worker deploy instructions. |
| `LIBRARIES.md` | Detailed library-availability documentation. |
| `favicon.svg` | Site icon. |

## Key commands

```bash
# Regenerate all book pages + sitemap (run after data or template changes)
python3 generate_pages.py

# Regenerate with a different site URL or API base
SITE_URL=https://example.com/golden-shelf-kids GSK_API_BASE=https://... python3 generate_pages.py

# Serve locally with live library availability
python3 serve.py                 # http://127.0.0.1:8000
python3 serve.py --port 8765
python3 serve.py --cache-ttl 60  # cache API responses for 60s

# Refresh availability cache
python3 scripts/update_library_availability.py --slug sector-7
python3 scripts/update_library_availability.py --isbn 9780395746561
python3 scripts/update_library_availability.py --all --limit 50
python3 scripts/update_library_availability.py --slug sector-7 --library frisco --dry-run

# Deploy the Worker (from worker/)
cd worker && npx wrangler deploy
```

## Architecture notes

- **No build step** for HTML/CSS/JS. Tailwind and Alpine.js load from CDNs.
- `index.html` fetches `data/books.json` at runtime and renders client-side.
- Book pages are **pre-generated** by `generate_pages.py` from `data/books.json` + templates embedded in the script.
- Live availability: book pages call `/api/library-availability?isbn=...&title=...` (provided by `serve.py` locally or the Worker in production). On a static host with no API, pages fall back to **Check** buttons.
- The Worker (`worker/index.js`) duplicates the fetcher logic from `scripts/update_library_availability.py` because it runs in a JS runtime. Keep them in sync.

## Conventions

- **Do not hand-edit `books/*.html` or `sitemap.xml`** — they are generated. Edit `generate_pages.py` and regenerate.
- **Do not commit** `__pycache__/`, `*.pyc`, or `worker/.wrangler/` (already in `.gitignore`).
- When changing library data, update `data/libraries.json`. `serve.py` reads it dynamically, but the Worker's `LIBRARIES` array in `worker/index.js` is hardcoded — update it too. The availability script reads `libraries.json`.
- ISBNs are ISBN-13 without hyphens as keys in `library-availability.json`.
- Slugs are derived from titles; stored `slug` field in `books.json` takes precedence.
- Environment variables: `SITE_URL`, `GSK_API_BASE`.

## Data model (book record)

Key fields in `data/books.json`:

- `title`, `author`
- `isbn_13`
- `publication_year`, `page_count`
- `genres_tags` (array)
- `goodreads.rating`, `goodreads.ratings_count`
- `summary.overview`, `summary.key_takeaways`
- `one_sentence_hook`
- `cover_image_url`, `cover_ol_id`
- `age_group` (`0-3`, `3-5`, `5-8`, `8-12`, `teen`)
- `fiction` (boolean)
- `slug`, `id`

## Testing / validation

There is no automated test suite. After changes:

- Regenerate pages and confirm `books/` still contains 7,500 files.
- Run `python3 serve.py` and open a book page; verify the library panel updates.
- `curl "http://127.0.0.1:8000/api/health"` and `/api/library-availability?isbn=...&title=...`.
- Validate JSON: `python3 -c "import json; json.load(open('data/books.json'))"`.
- For Worker changes, `cd worker && npx wrangler dev` then curl the local Worker URL.

## Git

- Default branch: `main`. Remote: `git@github.com:ShivrajRath/golden-shelf-kids.git`.
- Commit small, focused changes with descriptive messages; push to `main`.
- Generated `books/` changes can be large — prefer committing regeneration as its own commit.

## Safety

- Never store library credentials or API keys in the repo.
- Keep catalog requests polite (the availability script defaults to 1 req/s).
- Do not delete or overwrite user data without confirmation.
