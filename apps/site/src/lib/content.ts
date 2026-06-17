import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@lib/i18n';

type PostEntry = CollectionEntry<'posts'>;
type TalkEntry = CollectionEntry<'talks'>;
type LabEntry = CollectionEntry<'labs'>;
type GameEntry = CollectionEntry<'games'>;
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

export async function getLabsByLocale(locale: Locale): Promise<LabEntry[]> {
  const all = await getCollection('labs');
  return all
    .filter((l) => l.data.language === locale)
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}

export async function getGamesByLocale(locale: Locale): Promise<GameEntry[]> {
  const all = await getCollection('games');
  return all
    .filter((g) => g.data.language === locale)
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}

export async function getLabBySlug(slug: string, locale: Locale): Promise<LabEntry | undefined> {
  const all = await getCollection('labs');
  return all.find((l) => l.data.slug === slug && l.data.language === locale);
}

export async function getGameBySlug(slug: string, locale: Locale): Promise<GameEntry | undefined> {
  const all = await getCollection('games');
  return all.find((g) => g.data.slug === slug && g.data.language === locale);
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

/** Books I've read/tried — the journal archive, newest first. */
export async function getStampedBooks(): Promise<BookEntry[]> {
  const all = await getCollection('books', isPublished);
  return all
    .filter((b) => b.data.status !== 'backlog')
    .sort((a, b) => readAtTime(b) - readAtTime(a));
}

async function getBacklogBooksRaw(): Promise<BookEntry[]> {
  const all = await getCollection('books', isPublished);
  return all.filter((b) => b.data.status === 'backlog');
}

async function getLinksByStatus(status: 'stamped' | 'backlog'): Promise<LinkEntry[]> {
  const all = await getCollection('links', isPublished);
  return all.filter((l) => (l.data.status ?? 'stamped') === status);
}

export async function getBookBySlug(slug: string): Promise<BookEntry | undefined> {
  const all = await getCollection('books', isPublished);
  return all.find((b) => b.slug === slug);
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
  | { kind: 'photos'; date: Date; caption?: string | undefined; location?: string | undefined; photos: string[] };

function byDateDesc(a: TimelineEntry, b: TimelineEntry): number {
  return b.date.getTime() - a.date.getTime();
}

export async function getWritingTalkingTimeline(): Promise<TimelineEntry[]> {
  const [posts, talks] = await Promise.all([getPosts(), getTalks()]);
  const entries: TimelineEntry[] = [
    ...posts.map((post): TimelineEntry => ({ kind: 'post', date: post.data.publishedAt, post })),
    ...talks.map((talk): TimelineEntry => ({ kind: 'talk', date: talk.data.date, talk })),
  ];
  return entries.sort(byDateDesc);
}

/** The "stamped" archive: books + links read/tried, dated, newest first. */
export async function getInspirationTimeline(): Promise<TimelineEntry[]> {
  const [books, links] = await Promise.all([getStampedBooks(), getLinksByStatus('stamped')]);
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
export async function getBacklogTimeline(): Promise<TimelineEntry[]> {
  const [books, links] = await Promise.all([getBacklogBooksRaw(), getLinksByStatus('backlog')]);
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
 * Photos taken the same day under the same caption collapse into one
 * timeline moment.
 */
export async function getPersonalTimeline(): Promise<TimelineEntry[]> {
  const [standalone, talks] = await Promise.all([getCollection('gallery'), getTalks()]);

  const moments = new Map<string, Extract<TimelineEntry, { kind: 'photos' }>>();
  function addPhotos(date: Date, photos: string[], caption?: string, location?: string): void {
    const key = `${date.toISOString().slice(0, 10)}|${caption ?? ''}|${location ?? ''}`;
    const existing = moments.get(key);
    if (existing) {
      existing.photos.push(...photos);
    } else {
      moments.set(key, { kind: 'photos', date, caption, location, photos: [...photos] });
    }
  }

  for (const entry of standalone) {
    addPhotos(entry.data.date, [entry.data.src], entry.data.caption, entry.data.location);
  }
  for (const talk of talks) {
    if (talk.data.photos.length > 0) {
      addPhotos(talk.data.date, talk.data.photos, talk.data.event);
    }
  }

  return [...moments.values()].sort(byDateDesc);
}
