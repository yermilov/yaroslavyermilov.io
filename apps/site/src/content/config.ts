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
    language: localeEnum.optional(),
    abstract: z.string(),
    videoUrl: z.string().url().optional(),
    /** Recording exists but is private; render an on-request CTA instead of a player. */
    videoOnRequest: z.boolean().default(false),
    slidesUrl: z.string().url().optional(),
    repoUrl: z.string().url().optional(),
    eventUrl: z.string().url().optional(),
    /** paths under apps/site/public/, e.g. "/talks/<slug>/01.jpg" */
    photos: z.array(z.string()).default([]),
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
    /** 1–5 stars; omit when unrated */
    rating: z.number().min(1).max(5).optional(),
    /** "stamped" = read/tried (the journal archive); "backlog" = planned. */
    status: z.enum(['stamped', 'backlog']).default('stamped'),
    /** when it landed on the backlog — orders the (undated) backlog, newest first. */
    addedAt: z.coerce.date().optional(),
    /** when it was read — required for stamped books, absent for backlog. */
    readAt: z.coerce.date().optional(),
    /** the read date is a rough guess — render "long time ago" and bucket
        these together instead of an exact stamp. readAt still orders them. */
    readApprox: z.boolean().default(false),
    /** language of the review/notes, not the book itself */
    language: localeEnum,
    summary: z.string(),
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
    status: z.enum(['stamped', 'backlog']).default('stamped'),
    addedAt: z.coerce.date().optional(),
    readAt: z.coerce.date().optional(),
    readApprox: z.boolean().default(false),
    summary: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, talks, labs, games, gallery, books, links };
