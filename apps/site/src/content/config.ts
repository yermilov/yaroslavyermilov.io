import { defineCollection, z } from 'astro:content';

const localeEnum = z.enum(['en', 'ua']);

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    language: localeEnum,
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    summary: z.string(),
    translations: z
      .object({
        en: z.string().optional(),
        ua: z.string().optional(),
      })
      .default({}),
    canonicalSlug: z.string(),
    featured: z.boolean().default(false),
    interactive: z.enum(['none', 'tier1', 'tier2', 'tier3']).default('none'),
    coverImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const talks = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    event: z.string(),
    date: z.coerce.date(),
    /** Language the talk was delivered in — drives the UA/EN badge, not the
        displayed copy (the English fields above are the default; the *Uk
        overrides below render on /ua/). */
    language: localeEnum.optional(),
    abstract: z.string(),
    /** Ukrainian overrides shown on /ua/; fall back to the English default. */
    titleUk: z.string().optional(),
    eventUk: z.string().optional(),
    abstractUk: z.string().optional(),
    videoUrl: z.string().url().optional(),
    /** Recording exists but is private; render an on-request CTA instead of a player. */
    videoOnRequest: z.boolean().default(false),
    slidesUrl: z.string().url().optional(),
    repoUrl: z.string().url().optional(),
    eventUrl: z.string().url().optional(),
    /** paths under apps/site/public/, e.g. "/talks/<slug>/01.jpg" */
    photos: z.array(z.string()).default([]),
    /**
     * Audience feedback quoted from LinkedIn. Each entry renders as a native
     * LinkedInCard (no third-party script). `excerpt` is the talk-related part
     * of the post — not the whole thing — and `url` opens the real post.
     */
    feedback: z
      .array(
        z.object({
          author: z.string(),
          /** role / headline line shown under the name */
          headline: z.string().optional(),
          /** path under apps/site/public/, e.g. "/talks/<slug>/feedback/<name>.jpg" */
          avatar: z.string().optional(),
          /** the talk-related excerpt of the post */
          excerpt: z.string(),
          url: z.string().url(),
          date: z.coerce.date().optional(),
        }),
      )
      .default([]),
  }),
});

const labs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    publishedAt: z.coerce.date(),
    language: localeEnum,
    summary: z.string(),
    /** path under src/components/lab/, e.g. "ColorClock" */
    islandComponent: z.string(),
  }),
});

const games = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    /** must match apps/game-<slug> and public/games/<slug>/ */
    slug: z.string(),
    publishedAt: z.coerce.date(),
    language: localeEnum,
    summary: z.string(),
    controls: z.string(),
    width: z.number().default(960),
    height: z.number().default(640),
  }),
});

const gallery = defineCollection({
  type: 'data',
  schema: z.object({
    date: z.coerce.date(),
    caption: z.string().optional(),
    location: z.string().optional(),
    /** path under apps/site/public/, e.g. "/gallery/2018-08-15.jpg" */
    src: z.string(),
  }),
});

const books = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    author: z.string(),
    /** path under apps/site/public/, e.g. "/books/<slug>/cover.jpg" */
    cover: z.string(),
    /** 0–5 stars; omit when unrated (0 is an explicit zero, shown as ☆☆☆☆☆) */
    rating: z.number().min(0).max(5).optional(),
    /** "stamped" = read/tried (the journal archive); "backlog" = planned. */
    status: z.enum(['stamped', 'backlog']).default('stamped'),
    /** when it landed on the backlog — orders the (undated) backlog, newest first. */
    addedAt: z.coerce.date().optional(),
    /** when it was read — required for stamped books, absent for backlog. */
    readAt: z.coerce.date().optional(),
    /** the read date is a rough guess — render "long time ago" and bucket
        these together instead of an exact stamp. readAt still orders them. */
    readApprox: z.boolean().default(false),
    /** language of the review/notes body (the detail-page notes); the summary
        defaults to English with an optional Ukrainian override below. */
    language: localeEnum,
    summary: z.string(),
    /** Ukrainian summary shown on /ua/; falls back to the English default. */
    summaryUk: z.string().optional(),
    genre: z.string().optional(),
    series: z.string().optional(),
    /** external bookstore link (Amazon, publisher, etc.) */
    affiliateUrl: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});

/**
 * Inspiration links — tweets, articles, videos, podcasts. Unlike books they
 * have no internal detail page; their title links straight out. They share
 * the books' backlog/stamped split so both kinds interleave on /inspiration/.
 */
const links = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    url: z.string().url(),
    /** attribution shown in the kindline, e.g. "Thariq · X". */
    source: z.string(),
    kind: z.enum(['tweet', 'article', 'video', 'podcast', 'link']).default('link'),
    /** 0–5 stars; omit when unrated. Gates promotion to the home shelf. */
    rating: z.number().min(0).max(5).optional(),
    status: z.enum(['stamped', 'backlog']).default('stamped'),
    addedAt: z.coerce.date().optional(),
    readAt: z.coerce.date().optional(),
    readApprox: z.boolean().default(false),
    summary: z.string().optional(),
    /** poster/preview image under apps/site/public/, e.g. "/links/<slug>/poster.jpg" */
    thumbnail: z.string().optional(),
    /** show a play affordance over the thumbnail (clicking opens the source). */
    hasVideo: z.boolean().default(false),
    /**
     * Tweet-card fields (kind: 'tweet'). When `handle` is present, /inspiration/
     * renders an embedded TweetCard (avatar, @handle, verbatim body) instead of
     * the plain link row — the native sibling of the talks' LinkedIn cards.
     */
    handle: z.string().optional(),
    /** the tweet's own date (distinct from addedAt/readAt, which track curation). */
    postedAt: z.coerce.date().optional(),
    /** author avatar under apps/site/public/, e.g. "/links/<slug>/avatar.jpg". */
    avatar: z.string().optional(),
    /** verbatim tweet text rendered as the card body (links expanded, media stripped). */
    body: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, talks, labs, games, gallery, books, links };
