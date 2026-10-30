# Golden Shelf Kids — live library API (Cloudflare Worker)

This Worker is the production counterpart of `serve.py`. It exposes
`/api/library-availability?isbn=...&title=...` and queries the Frisco,
Harris County, and Plano catalogs live (The Colony, Little Elm, and Houston
block automated access and keep a **Check** link).

## Deploy

1. Install Wrangler (once):
   ```bash
   npm install -g wrangler
   ```
2. Log in:
   ```bash
   npx wrangler login
   ```
3. From this directory:
   ```bash
   cd worker
   npx wrangler deploy
   ```
   Wrangler prints the Worker URL, e.g.
   `https://gsk-library-api.<your-subdomain>.workers.dev`.

4. (Optional but recommended) Add a custom route in the Cloudflare dashboard so
   the API lives on your own domain, e.g.
   `https://novicelab.org/gsk-api/*` → this Worker.

## Point the site at the Worker

Rebuild the book pages with the API base URL baked in:

```bash
# from the repo root
GSK_API_BASE=https://gsk-library-api.<your-subdomain>.workers.dev python3 generate_pages.py
# or, with a custom route:
GSK_API_BASE=https://novicelab.org/gsk-api python3 generate_pages.py
```

Then commit and push. Every book page will fetch live status from the Worker
on load. No cached numbers are shipped with the site.

## Test locally

```bash
cd worker
npx wrangler dev
# then, in another shell:
curl "http://127.0.0.1:8787/api/library-availability?isbn=9780395746561&title=Sector+7"
```
