/**
 * The live book shelf, read SERVER-SIDE from juggernaut's /books miniapp
 * (task 5abd736c). The endpoint is gated by a shared bearer token, so it is
 * fetched here — in the Astro server — and only rendered HTML ever reaches a
 * browser. The token must never be imported into a client island.
 *
 * Env (runtime, read from `process.env` so a Railway variable change needs no
 * rebuild):
 *   JUGGERNAUT_BOOKS_URL    full URL of GET /api/public/books/shelf
 *   JUGGERNAUT_BOOKS_TOKEN  the shared bearer token
 *
 * Caching: one in-process copy, fresh for 10 minutes. When juggernaut is down
 * the last good copy keeps serving (however old); with no copy at all the page
 * renders its "unavailable" state instead of a 500. A failure is not retried
 * for a minute, so an outage does not make every request wait out the timeout.
 */
import { marked } from 'marked';

export interface ShelfReadingBook {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  format: string;
  progressPercent: number | null;
  startedAt: string | null;
}

export interface ShelfFinishedBook {
  id: string;
  rank: number | null;
  title: string;
  authors: string[];
  coverUrl: string | null;
  format: string;
  rating: number | null;
  finishedAt: string | null;
  summary: { en: string | null; uk: string | null };
}

export interface Shelf {
  reading: ShelfReadingBook[];
  finished: ShelfFinishedBook[];
}

/** Yarik's feedback on a finished book, as HTML. It is his own markdown,
 *  edited in juggernaut (the `summary` field), so it is trusted for meaning but
 *  rendered defensively all the same: raw HTML comes out as visible text rather
 *  than markup, and only http(s) links survive. */
export function feedbackHtml(markdown: string): string {
  return marked.parse(markdown, { async: false, gfm: true, breaks: false, renderer: feedbackRenderer });
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const feedbackRenderer = new marked.Renderer();
const renderLink = feedbackRenderer.link.bind(feedbackRenderer);
// Block and inline HTML alike reach this hook; print it, never inject it.
feedbackRenderer.html = (token) => escapeHtml(token.text);
// A link with any other scheme keeps its words and loses the href; an image
// keeps only its alt text (which marked has already escaped).
feedbackRenderer.link = (token) =>
  /^https?:\/\//i.test(token.href) ? renderLink(token) : feedbackRenderer.parser.parseInline(token.tokens);
feedbackRenderer.image = (token) => token.text;

const FRESH_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 5000;
/** After a failed fetch, serve what we have for this long before asking again,
 *  so a juggernaut outage does not cost every visitor the full timeout. */
const RETRY_AFTER_FAILURE_MS = 60 * 1000;

let cached: { shelf: Shelf; at: number } | null = null;
let inFlight: Promise<Shelf | null> | null = null;
let lastFailureAt = 0;

const isStr = (v: unknown): v is string => typeof v === 'string';
const isStrOrNull = (v: unknown) => v === null || typeof v === 'string';
const isNumOrNull = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v));
const isStrArray = (v: unknown) => Array.isArray(v) && v.every(isStr);

function isReadingBook(v: unknown): v is ShelfReadingBook {
  const b = v as Record<string, unknown> | null;
  return (
    !!b &&
    isStr(b.id) &&
    isStr(b.title) &&
    isStrArray(b.authors) &&
    isStrOrNull(b.coverUrl) &&
    isStr(b.format) &&
    isNumOrNull(b.progressPercent) &&
    isStrOrNull(b.startedAt)
  );
}

function isFinishedBook(v: unknown): v is ShelfFinishedBook {
  const b = v as Record<string, unknown> | null;
  const summary = b?.summary as Record<string, unknown> | null | undefined;
  return (
    !!b &&
    isStr(b.id) &&
    isNumOrNull(b.rank) &&
    isStr(b.title) &&
    isStrArray(b.authors) &&
    isStrOrNull(b.coverUrl) &&
    isStr(b.format) &&
    isNumOrNull(b.rating) &&
    isStrOrNull(b.finishedAt) &&
    !!summary &&
    isStrOrNull(summary.en) &&
    isStrOrNull(summary.uk)
  );
}

/** Every row the page reads is checked before the response is accepted — a
 *  malformed payload must fall back to the last good copy, never be cached
 *  and then throw while rendering. */
function isShelf(value: unknown): value is Shelf {
  const v = value as Partial<Shelf> | null;
  return (
    !!v &&
    Array.isArray(v.reading) &&
    Array.isArray(v.finished) &&
    v.reading.every(isReadingBook) &&
    v.finished.every(isFinishedBook)
  );
}

async function fetchShelf(): Promise<Shelf | null> {
  const url = process.env.JUGGERNAUT_BOOKS_URL;
  const token = process.env.JUGGERNAUT_BOOKS_TOKEN;
  if (!url || !token) {
    console.warn('[shelf] JUGGERNAUT_BOOKS_URL / JUGGERNAUT_BOOKS_TOKEN not set');
    return null;
  }
  try {
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[shelf] juggernaut answered ${res.status}`);
      return null;
    }
    const body: unknown = await res.json();
    if (!isShelf(body)) {
      console.warn('[shelf] juggernaut answered an unexpected shape');
      return null;
    }
    return body;
  } catch (err) {
    console.warn(`[shelf] fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/** The shelf, or null when juggernaut has never answered since boot. */
export async function getShelf(now = Date.now()): Promise<Shelf | null> {
  if (cached && now - cached.at < FRESH_MS) return cached.shelf;
  if (now - lastFailureAt < RETRY_AFTER_FAILURE_MS) return cached?.shelf ?? null;
  // One refresh at a time: concurrent requests share it rather than each
  // hitting juggernaut.
  inFlight ??= fetchShelf().finally(() => {
    inFlight = null;
  });
  const fresh = await inFlight;
  if (fresh) {
    cached = { shelf: fresh, at: Date.now() };
    return fresh;
  }
  lastFailureAt = Date.now();
  return cached?.shelf ?? null;
}
