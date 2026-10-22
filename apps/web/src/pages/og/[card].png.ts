export const prerender = true;
/**
 * Build-time OG image endpoint: /og/<id>.png for the home page, each section
 * (per locale), and every post, talk, and book. IDs are prefixed by kind so
 * slugs can never collide across collections.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { LOCALES, bcp47Locale, t, type Locale } from '@lib/i18n';
import { getAllAnnouncements, getPosts, getTalks, postSlug } from '@lib/content';
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
      id: `books-${locale}`,
      language: locale,
      eyebrow: 'VOL. 02',
      title: strings.sections.books.title,
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

  // externalUrl talks have no detail page to carry an OG card.
  for (const talk of (await getTalks()).filter((t) => !t.data.externalUrl)) {
    const language = talk.data.language ?? 'en';
    cards.push({
      id: `talk-${talk.slug}`,
      language,
      // The kind word tracks the format — an interview or a panel shouldn't announce itself as a
      // TALK. English on every card by design (see the book note below): the eyebrow is
      // language-neutral chrome, so this reads INTERVIEW / PANEL, not their UA labels.
      eyebrow: `${talk.data.format.toUpperCase()} · ${talk.data.event.toUpperCase()} · ${fmtDate(talk.data.date, language)}`,
      title: talk.data.title,
    });
  }

  /* Announcements get a card in the site's own identity rather than reusing the
     organiser's poster: that artwork is shared across the whole speaker line-up, so it
     says nothing about this talk. Built from every announcement, past ones included —
     the detail page outlives the event, so its card has to as well. */
  for (const announcement of await getAllAnnouncements()) {
    const language = announcement.data.language ?? 'en';
    cards.push({
      id: `announcement-${announcement.slug}`,
      language,
      eyebrow: `UPCOMING · ${announcement.data.event.toUpperCase()} · ${fmtDate(announcement.data.date, language)}`,
      title: announcement.data.title,
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
