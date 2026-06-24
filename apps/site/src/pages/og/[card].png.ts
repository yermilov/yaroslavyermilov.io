/**
 * Build-time OG image endpoint: /og/<id>.png for the home page, each section
 * (per locale), and every post, talk, and book. IDs are prefixed by kind so
 * slugs can never collide across collections.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { LOCALES, bcp47Locale, t, type Locale } from '@lib/i18n';
import { getBooks, getPosts, getTalks, postSlug } from '@lib/content';
import { renderOgCard, type OgCard } from '@lib/og-card';

function fmtDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(bcp47Locale(locale), { dateStyle: 'medium' })
    .format(date)
    .replace(/\s*р\.$/, '') // uk-UA appends " р." (рік) — noise in a label
    .toUpperCase();
}

async function buildCards(): Promise<OgCard[]> {
  const cards: OgCard[] = [];

  for (const locale of LOCALES) {
    const strings = t(locale);
    cards.push({
      id: `home-${locale}`,
      language: locale,
      eyebrow: strings.home.role.toUpperCase(),
      title: strings.site.title,
    });
    cards.push({
      id: `writing-talking-${locale}`,
      language: locale,
      eyebrow: 'VOL. 01',
      title: strings.sections.writingTalking.title,
    });
    cards.push({
      id: `inspiration-${locale}`,
      language: locale,
      eyebrow: 'VOL. 02',
      title: strings.sections.inspiration.title,
    });
    cards.push({
      id: `personal-${locale}`,
      language: locale,
      eyebrow: 'VOL. 03',
      title: strings.sections.personal.title,
    });
    cards.push({
      id: `workshop-${locale}`,
      language: locale,
      eyebrow: 'VOL. 04',
      title: strings.workshop.headline,
    });
  }

  for (const post of await getPosts()) {
    cards.push({
      id: `post-${postSlug(post)}`,
      language: post.data.language,
      eyebrow: `POST · ${fmtDate(post.data.publishedAt, post.data.language)}`,
      title: post.data.title,
    });
  }

  for (const talk of await getTalks()) {
    const language = talk.data.language ?? 'en';
    cards.push({
      id: `talk-${talk.slug}`,
      language,
      eyebrow: `TALK · ${talk.data.event.toUpperCase()} · ${fmtDate(talk.data.date, language)}`,
      title: talk.data.title,
    });
  }

  // One card per canonicalSlug (the cover + English title/author are
  // language-neutral); the id matches the detail page's ogImage path.
  const seenBooks = new Set<string>();
  for (const book of await getBooks()) {
    if (seenBooks.has(book.data.canonicalSlug)) continue;
    seenBooks.add(book.data.canonicalSlug);
    cards.push({
      id: `book-${book.data.canonicalSlug}`,
      language: book.data.language,
      eyebrow: `BOOK · ${book.data.author.toUpperCase()}`,
      title: book.data.title,
    });
  }

  return cards;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const cards = await buildCards();
  return cards.map((card) => ({ params: { card: card.id }, props: { card } }));
};

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgCard((props as { card: OgCard }).card);
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
