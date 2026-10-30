// Cloudflare Worker that provides LIVE library availability for Golden Shelf Kids.
// Deploy with:  npx wrangler deploy   (from the worker/ directory)
// Then set the meta tag in the generated pages (see worker/README.md).

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DIGITAL_FORMATS = new Set(["EBOOK", "EAUDIOBOOK", "EMAGAZINE", "STREAMING_VIDEO"]);
const FORMAT_LABELS = {
  BOOK: "Book", PICTURE_BOOK: "Picture book", LARGE_PRINT: "Large print",
  PAPERBACK: "Paperback", HARDCOVER: "Hardcover", AUDIOBOOK: "Audiobook",
  EBOOK: "eBook", EAUDIOBOOK: "eAudiobook", EMAGAZINE: "eMagazine",
  DVD: "DVD", BLU_RAY: "Blu-ray", MUSIC_CD: "Music CD",
  BOOK_CLUB_KIT: "Book club kit",
};

const LIBRARIES = [
  { id: "frisco", name: "Frisco Public Library", city: "Frisco, TX", system: "BiblioCommons", catalog_type: "bibliocommons", auto_update: true, catalog_url: "https://friscolibrary.bibliocommons.com", search_url: "https://friscolibrary.bibliocommons.com/v2/search?query={query}&searchType=keyword", homepage: "https://friscolibrary.com", digital_url: "https://libbyapp.com/library/frisco/search/query-{query}/page-1", digital_label: "eBook / eAudiobook" },
  { id: "the-colony", name: "The Colony Public Library", city: "The Colony, TX", system: "Aspen Discovery", catalog_type: "aspen", auto_update: false, catalog_url: "https://tcpl.aspendiscovery.org", search_url: "https://tcpl.aspendiscovery.org/Search/Results?lookfor={query}&type=all", homepage: "https://www.thecolonytx.gov/1237/Library", digital_url: "https://ebook.yourcloudlibrary.com/library/thecolonyplereadtx", digital_label: "eBook / eAudiobook" },
  { id: "little-elm", name: "Little Elm Public Library", city: "Little Elm, TX", system: "Koha", catalog_type: "koha", auto_update: false, catalog_url: "https://littleelm.bywatersolutions.com", search_url: "https://littleelm.bywatersolutions.com/cgi-bin/koha/opac-search.pl?q={query}", homepage: "https://www.littleelm.gov", digital_url: "https://ebook.yourcloudlibrary.com/library/littleelmpl", digital_label: "eBook / eAudiobook" },
  { id: "plano", name: "Plano Public Library System", city: "Plano, TX", system: "SirsiDynix Enterprise", catalog_type: "sirsi", auto_update: true, catalog_url: "https://plano.ent.sirsi.net/client/en_US/default", search_url: "https://plano.ent.sirsi.net/client/en_US/default/search/results?qu={query}&te=", homepage: "https://www.plano.gov/library", digital_url: "https://libbyapp.com/library/plano/search/query-{query}/page-1", digital_label: "eBook / eAudiobook" },
  { id: "harris-county", name: "Harris County Public Library", city: "Harris County, TX", system: "BiblioCommons", catalog_type: "bibliocommons", auto_update: true, catalog_url: "https://hcpl.bibliocommons.com", search_url: "https://hcpl.bibliocommons.com/v2/search?query={query}&searchType=keyword", homepage: "https://hcpl.net", digital_url: "https://libbyapp.com/library/hcpl/search/query-{query}/page-1", digital_label: "eBook / eAudiobook" },
  { id: "houston", name: "Houston Public Library", city: "Houston, TX", system: "SirsiDynix Enterprise", catalog_type: "sirsi", auto_update: false, catalog_url: "https://halan.sdp.sirsi.net/client/en_US/hou", search_url: "https://halan.sdp.sirsi.net/client/en_US/hou/search/results?qu={query}&te=", homepage: "https://houstonlibrary.org", digital_url: "https://libbyapp.com/library/houstonlibrary/search/query-{query}/page-1", digital_label: "eBook / eAudiobook" },
];

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}
function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders() },
  });
}

function normalizeIsbn(v) {
  return String(v || "").replace(/[^0-9Xx]/g, "").toUpperCase();
}
function isValidIsbn13(v) {
  const s = normalizeIsbn(v);
  if (!/^\d{13}$/.test(s)) return false;
  let total = 0;
  for (let i = 0; i < 12; i++) total += parseInt(s[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (total % 10)) % 10 === parseInt(s[12]);
}
function htmlUnescape(s) {
  return String(s || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function cleanText(v) {
  return htmlUnescape(String(v || "")).replace(/\s+/g, " ").trim();
}
function fillQuery(template, book) {
  const isbn = normalizeIsbn(book.isbn_13);
  const title = String(book.title || "").trim();
  const author = String(book.author || "").trim();
  const query = isValidIsbn13(isbn) ? isbn : (`${title} ${author}`.trim() || isbn || title);
  const enc = (x) => encodeURIComponent(x).replace(/%20/g, "+");
  return String(template || "")
    .replace(/\{query\}/g, enc(query))
    .replace(/\{isbn\}/g, enc(isbn))
    .replace(/\{title\}/g, enc(title))
    .replace(/\{author\}/g, enc(author));
}

async function httpGet(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "identity",
      ...headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// ---------- BiblioCommons ----------
function extractBiblioCommonsState(page) {
  const m = page.match(/<script type="application\/json" data-iso-key="_0">(.*?)<\/script>/s);
  if (!m) return {};
  try { return JSON.parse(m[1]); } catch { return {}; }
}
function biblioCandidates(state) {
  const entities = state.entities || {};
  const bibs = entities.bibs || state.bibs || {};
  if (!bibs || typeof bibs !== "object") return [];
  const out = [];
  for (const [bibId, bib] of Object.entries(bibs)) {
    if (!bib || typeof bib !== "object") continue;
    const info = bib.briefInfo || {};
    const availability = bib.availability || {};
    const policy = bib.policy || {};
    if (!info || Object.keys(info).length === 0) continue;
    out.push({ bibId, info, availability, policy });
  }
  return out;
}
function bibliocommonsItem(lib, cand) {
  const { bibId, info, availability, policy } = cand;
  const available = parseInt(availability.availableCopies || 0) || 0;
  const total = parseInt(availability.totalCopies || 0) || 0;
  const holds = parseInt(availability.heldCopies || 0) || 0;
  const fmt = String(info.format || "BOOK").toUpperCase();
  const isDigital = String(availability.bibType || "").toUpperCase() === "DIGITAL" || DIGITAL_FORMATS.has(fmt);
  let status;
  if (available > 0) status = "available";
  else if (total > 0 || String(availability.status || "").toUpperCase() === "UNAVAILABLE") status = (holds > 0 ? "on_hold" : "unavailable");
  else status = "unknown";
  const holdable = policy.holdable !== false;
  let action;
  if (status === "available") action = "borrow";
  else if ((status === "unavailable" || status === "on_hold") && holdable) action = "hold";
  else action = "view";
  return {
    format: FORMAT_LABELS[fmt] || fmt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    status, available_copies: available, total_copies: total, holds, action,
    url: `${String(lib.catalog_url).replace(/\/$/, "")}/v2/record/${encodeURIComponent(String(bibId))}`,
    is_digital: isDigital,
  };
}
async function fetchBibliocommons(lib, book) {
  const isbn = normalizeIsbn(book.isbn_13);
  const title = cleanText(book.title).toLowerCase();
  const url = fillQuery(lib.search_url, book);
  const page = await httpGet(url);
  const state = extractBiblioCommonsState(page);
  const candidates = biblioCandidates(state);
  if (!candidates.length) throw new Error("no results parsed");
  let matching = candidates.filter((c) => {
    const isbns = (c.info.isbns || []).map(normalizeIsbn);
    return isbn && isbns.includes(isbn);
  });
  if (!matching.length && title) {
    matching = candidates.filter((c) => cleanText(c.info.title).toLowerCase() === title);
  }
  if (!matching.length) throw new Error("ISBN/title did not match a catalog record");
  const items = [];
  for (const isDigital of [false, true]) {
    const group = matching.filter((c) => {
      const digital = String(c.availability.bibType || "").toUpperCase() === "DIGITAL" || DIGITAL_FORMATS.has(String(c.info.format || "").toUpperCase());
      return digital === isDigital;
    });
    if (!group.length) continue;
    group.sort((a, b) => {
      const aa = parseInt(a.availability.availableCopies || 0) || 0;
      const bb = parseInt(b.availability.availableCopies || 0) || 0;
      if (bb !== aa) return bb - aa;
      const ta = parseInt(a.availability.totalCopies || 0) || 0;
      const tb = parseInt(b.availability.totalCopies || 0) || 0;
      if (tb !== ta) return tb - ta;
      const sa = String(a.availability.status || "").toUpperCase() === "AVAILABLE" ? 1 : 0;
      const sb = String(b.availability.status || "").toUpperCase() === "AVAILABLE" ? 1 : 0;
      return sb - sa;
    });
    items.push(bibliocommonsItem(lib, group[0]));
  }
  if (!items.length) throw new Error("no matching formats");
  return { checked_at: new Date().toISOString(), source: "BiblioCommons catalog", live: true, blocked: false, items };
}

// ---------- SirsiDynix ----------
function sirsiDocId(page, isbn) {
  const chunks = page.split(/<div id="results_cell\d+"/);
  let fallback = null;
  for (const chunk of chunks.slice(1)) {
    const m = chunk.match(/value="([^"]+)"[^>]*id="da\d+"/);
    if (!m) continue;
    const value = htmlUnescape(m[1]);
    if (fallback === null) fallback = value;
    if (isbn && normalizeIsbn(chunk).includes(isbn)) {
      const parsed = parseSirsiDocValue(value);
      if (parsed) return parsed;
    }
  }
  if (fallback) return parseSirsiDocValue(fallback);
  return null;
}
function parseSirsiDocValue(value) {
  const m = String(value || "").match(/^ent:\/\/([^/]+)\/\d+\/([^:]+):(\d+)/);
  if (!m) return null;
  return { source: m[2], docId: m[3] };
}
function sirsiUrls(lib, source, docId) {
  const base = String(lib.catalog_url).replace(/\/$/, "");
  const encoded = `ent:$002f$002f${source}$002f0$002f${source}:${docId}`;
  const detail = `${base}/search/detailnonmodal/${encoded}/one`;
  const availability = `${base}/search/detailnonmodal.detail.detailavailabilityaccordions.boundwithzone:lookupavailability/${encoded}/ILS/0/false/LIBRARY$002cCALLNUMBER?d=ent%3A%2F%2F${source}%2F0%2F${source}%3A${docId}%7E%7E0`;
  return { detail, availability };
}
function sirsiFormat(detailPage) {
  const text = cleanText(String(detailPage || "").replace(/<[^>]+>/g, " "));
  if (/\bAudiobook\b/i.test(text)) return "Audiobook";
  if (/\bLarge Print\b/i.test(text)) return "Large print";
  if (/\bDVD\b/i.test(text)) return "DVD";
  if (/\bBlu-ray\b/i.test(text)) return "Blu-ray";
  return "Book";
}
function sirsiAvailabilityPayload(page) {
  let data;
  try { data = JSON.parse(page); } catch { return {}; }
  for (const init of (data.inits || [])) {
    for (const script of (init.evalScript || [])) {
      const m = String(script).match(/updateWebServiceFields\((\{.*\})\)/s);
      if (m) {
        try { return JSON.parse(m[1]); } catch {}
      }
    }
  }
  return {};
}
async function fetchSirsi(lib, book) {
  const isbn = normalizeIsbn(book.isbn_13);
  const searchUrl = fillQuery(lib.search_url, book);
  const searchPage = await httpGet(searchUrl);
  const doc = sirsiDocId(searchPage, isbn);
  if (!doc) throw new Error("no catalog record found");
  const { detail: detailUrl, availability: availabilityUrl } = sirsiUrls(lib, doc.source, doc.docId);
  const detailPage = await httpGet(detailUrl);
  const payload = sirsiAvailabilityPayload(await httpGet(availabilityUrl, { "X-Requested-With": "XMLHttpRequest" }));
  if (!payload || Object.keys(payload).length === 0) throw new Error("availability endpoint returned no data");
  const asInt = (k) => { try { return parseInt(String(payload[k] || "0").trim() || "0") || 0; } catch { return 0; } };
  const available = asInt("availableCount");
  const total = asInt("copyCount");
  const holds = asInt("holdCount");
  const holdable = payload.holdable !== false;
  let status;
  if (available > 0) status = "available";
  else if (total > 0) status = (holds > 0 ? "on_hold" : "unavailable");
  else status = "unknown";
  let action;
  if (status === "available") action = "borrow";
  else if ((status === "unavailable" || status === "on_hold") && holdable) action = "hold";
  else action = "view";
  return {
    checked_at: new Date().toISOString(),
    source: "SirsiDynix Enterprise catalog",
    live: true,
    blocked: false,
    items: [{
      format: sirsiFormat(detailPage),
      status, available_copies: available, total_copies: total, holds, action,
      url: detailUrl, is_digital: false,
    }],
  };
}

function blockedEntry(lib, book) {
  const url = fillQuery(lib.search_url || lib.catalog_url || "", book);
  return {
    checked_at: null, source: "Catalog blocks automated requests", live: false, blocked: true,
    items: [{ format: "Book / eBook", status: "unknown", available_copies: null, total_copies: null, holds: 0, action: "search", url, is_digital: false }],
  };
}
function fallbackEntry(lib, book, error) {
  const url = fillQuery(lib.search_url || lib.catalog_url || "", book);
  return {
    checked_at: null, source: `Live check failed: ${error}`, live: false, blocked: false, error,
    items: [{ format: "Book / eBook", status: "unknown", available_copies: null, total_copies: null, holds: 0, action: "search", url, is_digital: false }],
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (url.pathname === "/api/health") {
      return json({ ok: true, time: new Date().toISOString() });
    }
    if (url.pathname === "/api/library-availability" || url.pathname === "/") {
      const isbn = url.searchParams.get("isbn") || "";
      const title = url.searchParams.get("title") || "";
      const author = url.searchParams.get("author") || "";
      const book = { isbn_13: isbn, title, author, slug: "" };
      const results = await Promise.all(LIBRARIES.map(async (lib) => {
        let entry;
        try {
          if (lib.catalog_type === "bibliocommons" && lib.auto_update) {
            entry = await fetchBibliocommons(lib, book);
          } else if (lib.catalog_type === "sirsi" && lib.auto_update) {
            entry = await fetchSirsi(lib, book);
          } else {
            entry = blockedEntry(lib, book);
          }
        } catch (e) {
          entry = fallbackEntry(lib, book, String(e && e.message ? e.message : e));
        }
        if (entry && entry.error) {
          entry = fallbackEntry(lib, book, entry.error);
        }
        return {
          id: lib.id, name: lib.name, city: lib.city, system: lib.system,
          homepage: lib.homepage || lib.catalog_url, catalog_url: lib.catalog_url,
          digital_url: lib.digital_url, digital_label: lib.digital_label,
          auto_update: !!lib.auto_update,
          checked_at: entry.checked_at || null, source: entry.source,
          live: !!entry.live, blocked: !!entry.blocked, error: entry.error || null,
          items: entry.items || [],
        };
      }));
      const payload = {
        isbn: normalizeIsbn(isbn), title: cleanText(title), author: cleanText(author),
        checked_at: new Date().toISOString(), libraries: results,
      };
      return json(payload);
    }
    return new Response("Not found", { status: 404, headers: corsHeaders() });
  },
};
