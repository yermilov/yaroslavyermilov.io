import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@lib/i18n';

type PostEntry = CollectionEntry<'posts'>;
type TalkEntry = CollectionEntry<'talks'>;
export type AnnouncementEntry = CollectionEntry<'announcements'>;
type LabEntry = CollectionEntry<'labs'>;
type BookEntry = CollectionEntry<'books'>;
type LinkEntry = CollectionEntry<'links'>;

/** Placeholder date for undated (backlog) entries; never displayed. */
const EPOCH = new Date(0);

const isProd = import.meta.env.PROD;
function isPublished<T extends { data: { draft?: boolean } }>(entry: T): boolean {
  return !(isProd && entry.data.draft);
}

/**
 * URL slug for a post. Posts live under content/posts/{en,ua}/<slug>.mdx,
 * so Astro auto-derives entry.slug as e.g. "en/2023-wrapped". The locale
 * directory is a categorization device — strip it for URLs.
 */
export function postSlug(entry: PostEntry): string {
  return entry.slug.split('/').pop() ?? entry.slug;
}

/**
 * All published posts across both locales, newest first. Locale-agnostic on
 * purpose: the same blog list is shown under /en/blog/ and /ua/blog/ so a
 * Ukrainian visitor doesn't land on an empty page just because nothing has
 * been translated yet. Per-post pages still respect the locale and surface
 * a "Translation pending" banner when a post is shown in the other shell.
 */
export async function getPosts(): Promise<PostEntry[]> {
  const all = await getCollection('posts', isPublished);
  return all.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}

/**
 * Posts for one locale's timeline: one entry per canonicalSlug, preferring the
 * active-locale version and falling back to the other language when no
 * translation exists yet — so /en/ shows English where it exists (and the
 * Ukrainian-only originals where it doesn't), without listing both at once.
 */
export async function getPostsByLocale(locale: Locale): Promise<PostEntry[]> {
  const all = await getCollection('posts', isPublished);
  const byCanonical = new Map<string, PostEntry>();
  for (const post of all) {
    const existing = byCanonical.get(post.data.canonicalSlug);
    if (!existing || (post.data.language === locale && existing.data.language !== locale)) {
      byCanonical.set(post.data.canonicalSlug, post);
    }
  }
  return [...byCanonical.values()].sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
  );
}

export async function getPostByCanonicalSlug(canonicalSlug: string, locale: Locale): Promise<PostEntry | undefined> {
  const all = await getCollection('posts', isPublished);
  return all.find((p) => p.data.canonicalSlug === canonicalSlug && p.data.language === locale);
}

export async function getAllCanonicalSlugs(): Promise<string[]> {
  const all = await getCollection('posts', isPublished);
  return [...new Set(all.map((p) => p.data.canonicalSlug))];
}

export async function getTalks(): Promise<TalkEntry[]> {
  const all = await getCollection('talks');
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/**
 * Announced-but-not-yet-delivered talks, soonest first.
 *
 * Filters by date rather than by hand: an announcement disappears on its own the day
 * after it happens, so nobody has to remember to delete it. `endDate` keeps a
 * multi-day conference listed for its whole run instead of vanishing on day two.
 * Drafts are dropped so a cancelled appearance can be kept without being shown.
 */
export async function getAnnouncements(now = new Date()): Promise<AnnouncementEntry[]> {
  /* Compared as CALENDAR DAYS, not instants. `z.coerce.date()` parses date-only
     frontmatter as midnight UTC, while a local midnight is a LATER UTC instant for any
     builder west of UTC — so an instant comparison drops a single-day announcement
     throughout its own event day, and a multi-day one on its final day, before the
     client-side correction ever runs. Plain YYYY-MM-DD strings have no time zone. */
  const utcDay = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  const localDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const all = await getCollection('announcements');
  return all
    .filter((a) => !a.data.draft)
    .filter((a) => utcDay(a.data.endDate ?? a.data.date) >= localDay)
    .sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
}

/**
 * URL slug for a lab. Labs live under content/labs/{en,ua}/<slug>.mdx, so Astro
 * derives entry.slug as e.g. "en/weather"; the URL uses just the trailing segment.
 */
export function labSlug(entry: LabEntry): string {
  return entry.slug.split('/').pop() ?? entry.slug;
}

/**
 * Labs for one locale's index: one entry per canonicalSlug, preferring the active
 * locale and falling back to the other language so a lab still appears (in its
 * original language) before it's been translated.
 *
 * `draft` labs are unlisted here in prod but keep their detail page — see the schema.
 */
export async function getLabsByLocale(locale: Locale): Promise<LabEntry[]> {
  const all = await getCollection('labs', isPublished);
  const byCanonical = new Map<string, LabEntry>();
  for (const lab of all) {
    const existing = byCanonical.get(lab.data.canonicalSlug);
    if (!existing || (lab.data.language === locale && existing.data.language !== locale)) {
      byCanonical.set(lab.data.canonicalSlug, lab);
    }
  }
  return [...byCanonical.values()].sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
  );
}

export async function getLabByCanonicalSlug(
  canonicalSlug: string,
  locale: Locale,
): Promise<LabEntry | undefined> {
  const all = await getCollection('labs');
  return (
    all.find((l) => l.data.canonicalSlug === canonicalSlug && l.data.language === locale) ??
    all.find((l) => l.data.canonicalSlug === canonicalSlug)
  );
}

/** readAt / addedAt are optional; treat missing as epoch for ordering. */
const readAtTime = (e: { data: { readAt?: Date } }): number => e.data.readAt?.getTime() ?? 0;
const addedAtTime = (e: { data: { addedAt?: Date } }): number => e.data.addedAt?.getTime() ?? 0;

/**
 * All published books, stamped (read) ones newest-first, backlog after.
 * Locale-agnostic — books appear under both /en/books/ and /ua/books/.
 * The detail page shows the entry in its own language regardless of which
 * locale shell wraps it.
 */
export async function getBooks(): Promise<BookEntry[]> {
  const all = await getCollection('books', isPublished);
  return all.sort((a, b) => readAtTime(b) - readAtTime(a));
}

/** URL slug for a book — strip the locale dir (content/books/{en,ua}/<slug>). */
export function bookSlug(entry: BookEntry): string {
  return entry.slug.split('/').pop() ?? entry.slug;
}

/** One book per canonicalSlug, preferring the active locale and falling back to
 *  the other language so a locale with no translation still shows the entry. */
function dedupeBooksByLocale(all: BookEntry[], locale: Locale): BookEntry[] {
  const byCanonical = new Map<string, BookEntry>();
  for (const book of all) {
    const existing = byCanonical.get(book.data.canonicalSlug);
    if (!existing || (book.data.language === locale && existing.data.language !== locale)) {
      byCanonical.set(book.data.canonicalSlug, book);
    }
  }
  return [...byCanonical.values()];
}

/** Books I've read/tried — the journal archive for one locale, newest first. */
export async function getStampedBooks(locale: Locale): Promise<BookEntry[]> {
  const all = await getCollection('books', isPublished);
  return dedupeBooksByLocale(all, locale)
    .filter((b) => b.data.status !== 'backlog')
    .sort((a, b) => readAtTime(b) - readAtTime(a));
}

async function getBacklogBooksRaw(locale: Locale): Promise<BookEntry[]> {
  const all = await getCollection('books', isPublished);
  return dedupeBooksByLocale(all, locale).filter((b) => b.data.status === 'backlog');
}

async function getLinksByStatus(status: 'stamped' | 'backlog'): Promise<LinkEntry[]> {
  const all = await getCollection('links', isPublished);
  return all.filter((l) => (l.data.status ?? 'stamped') === status);
}

/** Links I've read/tried — newest first. */
export async function getStampedLinks(): Promise<LinkEntry[]> {
  const links = await getLinksByStatus('stamped');
  return links.sort((a, b) => readAtTime(b) - readAtTime(a));
}

/** Resolve a book's per-locale entry by canonicalSlug, falling back to the
 *  other language when no translation exists (so the page never 404s). */
export async function getBookByCanonicalSlug(
  canonicalSlug: string,
  locale: Locale,
): Promise<BookEntry | undefined> {
  const all = await getCollection('books', isPublished);
  return (
    all.find((b) => b.data.canonicalSlug === canonicalSlug && b.data.language === locale) ??
    all.find((b) => b.data.canonicalSlug === canonicalSlug)
  );
}

export async function getAllBookCanonicalSlugs(): Promise<string[]> {
  const all = await getCollection('books', isPublished);
  return [...new Set(all.map((b) => b.data.canonicalSlug))];
}

/* ── Unified timelines ─────────────────────────────────────────────
 * The "writing & talking" section interleaves posts and talks into a
 * single reverse-chronological stream; "inspiration" wraps books the
 * same way so podcasts/links can join later without reshaping pages.
 */

export type TimelineEntry =
  | { kind: 'post'; date: Date; post: PostEntry }
  | { kind: 'talk'; date: Date; talk: TalkEntry }
  | { kind: 'book'; date: Date; book: BookEntry; approx?: boolean }
  | { kind: 'link'; date: Date; link: LinkEntry; approx?: boolean }
  | {
      kind: 'photos';
      date: Date;
      caption?: string | undefined;
      location?: string | undefined;
      photos: string[];
      /** src -> CSS object-position, only for shots that opted out of the centred crop. */
      focus?: Record<string, string> | undefined;
    };

function byDateDesc(a: TimelineEntry, b: TimelineEntry): number {
  return b.date.getTime() - a.date.getTime();
}

export async function getWritingTalkingTimeline(locale: Locale): Promise<TimelineEntry[]> {
  const [posts, talks] = await Promise.all([getPostsByLocale(locale), getTalks()]);
  const entries: TimelineEntry[] = [
    ...posts.map((post): TimelineEntry => ({ kind: 'post', date: post.data.publishedAt, post })),
    ...talks.map((talk): TimelineEntry => ({ kind: 'talk', date: talk.data.date, talk })),
  ];
  return entries.sort(byDateDesc);
}

/** The "stamped" archive: books + links read/tried, dated, newest first. */
export async function getInspirationTimeline(locale: Locale): Promise<TimelineEntry[]> {
  const [books, links] = await Promise.all([getStampedBooks(locale), getLinksByStatus('stamped')]);
  const entries: TimelineEntry[] = [
    ...books.map((book): TimelineEntry => ({
      kind: 'book',
      date: book.data.readAt ?? EPOCH,
      book,
      approx: book.data.readApprox,
    })),
    ...links.map((link): TimelineEntry => ({
      kind: 'link',
      date: link.data.readAt ?? EPOCH,
      link,
      approx: link.data.readApprox,
    })),
  ];
  return entries.sort(byDateDesc);
}

/**
 * The backlog: planned books + links, undated. Rendered in addedAt order
 * (most recently added first), with title as the tiebreaker.
 */
export async function getBacklogTimeline(locale: Locale): Promise<TimelineEntry[]> {
  const [books, links] = await Promise.all([getBacklogBooksRaw(locale), getLinksByStatus('backlog')]);
  const items = [
    ...books.map((book) => ({ entry: { kind: 'book', date: EPOCH, book } as TimelineEntry, item: book })),
    ...links.map((link) => ({ entry: { kind: 'link', date: EPOCH, link } as TimelineEntry, item: link })),
  ];
  items.sort(
    (a, b) =>
      addedAtTime(b.item) - addedAtTime(a.item) ||
      a.item.data.title.localeCompare(b.item.data.title),
  );
  return items.map((i) => i.entry);
}

/**
 * "Personal" interleaves standalone gallery shots with talk-event photos.
 * Both follow the SAME rule: a photo collapses into an Instagram-style carousel
 * ONLY when it's explicitly tagged as part of a near-identical burst — a gallery
 * `burst` id, or a talk `photoBursts` group — and every other shot is its own
 * tile. So a talk's photos are mostly individual moments, carouselled only where
 * genuine near-dupes exist.
 */
export async function getPersonalTimeline(): Promise<TimelineEntry[]> {
  const [standalone, talks] = await Promise.all([getCollection('gallery'), getTalks()]);

  const moments = new Map<string, Extract<TimelineEntry, { kind: 'photos' }>>();
  function addToKey(
    key: string,
    date: Date,
    photos: string[],
    caption?: string,
    location?: string,
    focus?: Record<string, string>,
  ): void {
    const existing = moments.get(key);
    if (existing) {
      existing.photos.push(...photos);
      if (focus) existing.focus = { ...existing.focus, ...focus };
    } else {
      moments.set(key, { kind: 'photos', date, caption, location, photos: [...photos], focus });
    }
  }

  for (const entry of standalone) {
    // A `burst` id carousels near-identical shots together; without it, a per-entry key keeps
    // each photo its own tile (so same-day-but-different shots no longer merge).
    const key = entry.data.burst ? `burst:${entry.data.burst}` : `single:${entry.id}`;
    // Only a shot that asked for it gets a non-centred crop anchor; see `focus` in the schema.
    const focus = entry.data.focus ? { [entry.data.src]: `center ${entry.data.focus}` } : undefined;
    addToKey(key, entry.data.date, [entry.data.src], entry.data.caption, entry.data.location, focus);
  }
  for (const talk of talks) {
    if (talk.data.photos.length === 0) continue;
    // Each near-identical burst carousels into one tile; every other talk photo
    // stands alone — mirroring the gallery `burst` rule for talk photo strips.
    // Walk `photos` in order and expand a burst at its first photo, so the grid
    // keeps the frontmatter sequence (a carousel sits where its lead shot would).
    const burstOf = new Map<string, string[]>();
    for (const group of talk.data.photoBursts) {
      for (const src of group) burstOf.set(src, group);
    }
    const emitted = new Set<string>();
    talk.data.photos.forEach((src, i) => {
      if (emitted.has(src)) return;
      const group = burstOf.get(src);
      if (group && group.length > 0) {
        addToKey(`talk-burst:${talk.id}|${i}`, talk.data.date, group, talk.data.event);
        for (const s of group) emitted.add(s);
      } else {
        addToKey(`talk-single:${talk.id}|${src}`, talk.data.date, [src], talk.data.event);
      }
    });
  }

  return [...moments.values()].sort(byDateDesc);
}
