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
    /** What the appearance actually WAS — not everything on stage is a talk. Drives the kind
        eyebrow ("ДОПОВІДЬ" / "ІНТЕРВ'Ю" / "ПАНЕЛЬНА ДИСКУСІЯ") in the writing-talking list and
        the OG card. Defaults to 'talk', so existing entries keep their label. */
    format: z.enum(['talk', 'interview', 'panel']).default('talk'),
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
    /**
     * Card thumbnail for the writing-talking list, path under public/. Use this — NOT `photos` —
     * for a promo still / key art / poster: `photos` are PHOTOS OF THE EVENT and every one of them
     * also becomes a moment in the /personal timeline, where a piece of marketing artwork does not
     * belong. Falls back to `photos[0]` so talks that only have real event shots still get a thumb.
     */
    cover: z.string().optional(),
    /** paths under apps/site/public/, e.g. "/talks/<slug>/01.jpg" */
    photos: z.array(z.string()).default([]),
    /** Near-identical bursts among `photos` that collapse into ONE Instagram-style
        carousel on /personal (the same rule as the gallery `burst` tag). Each inner
        array lists the photo paths — verbatim strings from `photos` — that belong to
        one burst; every photo NOT listed here stands on its own tile. Leave empty and
        each talk photo is an individual moment. The talk detail page still shows the
        full flat contact sheet regardless. */
    photoBursts: z.array(z.array(z.string())).default([]),
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
  // Labs live under content/labs/{en,ua}/<slug>.mdx (like posts/books), so Astro
  // derives entry.slug as e.g. "en/weather" — unique per file. The URL slug is
  // labSlug(entry) (the trailing segment) and `canonicalSlug` joins translations.
  schema: z.object({
    title: z.string(),
    /** joins the EN + UA versions of one lab; also the URL slug segment. */
    canonicalSlug: z.string(),
    publishedAt: z.coerce.date(),
    language: localeEnum,
    summary: z.string(),
    /** path under src/components/lab/, e.g. "ColorClock". Omit for an externalUrl card. */
    islandComponent: z.string().optional(),
    /** when set, the index card links straight here (external) and NO detail page is
     * generated — used for showcase entries that live elsewhere (e.g. a GitHub repo). */
    externalUrl: z.string().url().optional(),
    /** optional card image for the Pinterest-style index, path under public/,
     * e.g. "/lab/weather-cover.jpg". Falls back to a rendered preview if absent. */
    cover: z.string().optional(),
    /** true drops the prose header + max-width so the island runs edge-to-edge
     * (a full-screen two-column experience); default keeps the reading column.
     * NB: don't name this `layout` — Astro MDX reserves that frontmatter key. */
    fullBleed: z.boolean().optional(),
    /** drop the <h1> on the detail page but KEEP the date line + lede — for a lab whose body
     * opens with its own hook and shouldn't repeat its title back at the reader. (fullBleed
     * hides the title too, but takes the date and lede with it.) */
    hideTitle: z.boolean().optional(),
    /** drop the visible lede on the detail page. `summary` is still REQUIRED and still does its
     * other two jobs — the card subtitle on the lab index and the page's meta description — this
     * only stops it being printed above a body that already opens with the same thought. */
    hideLede: z.boolean().optional(),
    /** drop the subtitle under the card title on the lab index — for a card whose cover art and
     * title already say the whole thing, so the summary underneath is just noise. `summary` stays
     * REQUIRED and still serves as the page's meta description. */
    hideCardSummary: z.boolean().optional(),
    /** unlisted, not unpublished: the detail page is still built and stays reachable by direct
     * link, but the lab index card, the sitemap, site search and search engines all drop it. For a
     * lab that's finished but not announced yet. Like posts, the card only disappears in prod, so
     * the index still previews it in dev. */
    draft: z.boolean().optional(),
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
    /** shots sharing a `burst` id are near-identical and collapse into one carousel;
        omit it and the shot stands alone as its own tile. */
    burst: z.string().optional(),
    /** where to anchor the crop in the square grid tile. The tiles are 1:1 with
     * `object-fit: cover`, so a TALL photo gets cropped vertically — and the default
     * centre anchor slices the head off a standing portrait (the subject's face sits in
     * the top ~10% of the frame, while a centred square window only starts ~17% down).
     * Set `top` on those. Left unset it stays centred, which is what the venue/stage shots
     * want — they're even taller, and anchoring them to the top would fill the tile with
     * ceiling. There is no single global value that suits both: hence per shot. */
    focus: z.enum(['top', 'center', 'bottom']).optional(),
  }),
});

const books = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    /** joins a book's per-language files (content/books/{en,ua}/<slug>.md). */
    canonicalSlug: z.string(),
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
    kind: z.enum(['tweet', 'article', 'video', 'podcast', 'show', 'link']).default('link'),
    /** 0–5 stars; omit when unrated. Gates promotion to the home shelf. */
    rating: z.number().min(0).max(5).optional(),
    status: z.enum(['stamped', 'backlog']).default('stamped'),
    addedAt: z.coerce.date().optional(),
    readAt: z.coerce.date().optional(),
    readApprox: z.boolean().default(false),
    summary: z.string().optional(),
    /** Ukrainian summary shown on /ua/; falls back to the English default. */
    summaryUk: z.string().optional(),
    /** my own one-line take, shown with the star rating once a link is stamped/tried. */
    verdict: z.string().optional(),
    /** Ukrainian verdict shown on /ua/; falls back to the English default. */
    verdictUk: z.string().optional(),
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

/**
 * ANNOUNCEMENTS — talks that are announced but have NOT happened yet.
 *
 * Deliberately its own collection rather than a future-dated `talks` entry. `talks`
 * is an archive of what an appearance ACTUALLY WAS: its schema requires an
 * `abstract`, and its entries carry photos, video, slides and audience feedback —
 * all of which exist only afterwards. An announcement has none of that. What it has
 * instead is a poster and a date somebody else controls.
 *
 * Keeping them apart means neither has to pretend: the archive never contains an
 * event that has not happened, and an announcement is never a half-empty talk page.
 * When the talk is delivered, it graduates into `talks` with the material it earned.
 */
const announcements = defineCollection({
  type: 'content',
  schema: z.object({
    /** The talk's title. May be provisional until the organiser publishes the programme. */
    title: z.string(),
    /** Conference / meetup name, as the organiser writes it. */
    event: z.string(),
    /** When it happens. Drives the countdown and the automatic disappearance. */
    date: z.coerce.date(),
    /** Multi-day conferences: the last day, so the entry survives its whole run. */
    endDate: z.coerce.date().optional(),
    /** "Warsaw Expo XXI" — shown as-is, not geocoded. */
    location: z.string().optional(),
    /** Street address of the venue, as the organiser publishes it. Shown on the
        "how to attend" card next to the ticket link — a reader deciding whether to
        come needs the door, not just the building's marketing name. */
    venueAddress: z.string().optional(),
    /** Short pitch for the card. Optional on purpose: a conference often announces a
        speaker before the programme, and an announcement with no abstract yet is
        still worth showing — that is the whole reason this collection exists. */
    summary: z.string().optional(),
    /** The full pitch, as submitted to the organiser. Optional for the same reason
        `summary` is — but once the CFP is written there is no excuse for the site to
        paraphrase it, so the detail page renders this verbatim. Paragraphs split on
        blank lines, exactly like `talks.abstract`. */
    abstract: z.string().optional(),
    /** What an attendee walks away with — the CFP's key takeaways, rendered as the
        detail page's numbered act. Empty by default: most announcements won't have
        them until the talk is accepted. */
    takeaways: z.array(z.string()).default([]),
    /** Language the talk will be delivered in. */
    language: localeEnum.optional(),
    /** Ukrainian overrides shown on /ua/; fall back to the English defaults. */
    titleUk: z.string().optional(),
    eventUk: z.string().optional(),
    locationUk: z.string().optional(),
    summaryUk: z.string().optional(),
    abstractUk: z.string().optional(),
    takeawaysUk: z.array(z.string()).default([]),
    /** The conference site. */
    eventUrl: z.string().url().optional(),
    /** How a reader actually gets into the room: the tickets/registration page.
        Prefer the stable section anchor over a per-tier checkout URL — ticket tiers
        sell out and their deep links rot, the anchor doesn't. */
    ticketsUrl: z.string().url().optional(),
    /** Where the appearance was announced (a LinkedIn post, the programme page). */
    announcementUrl: z.string().url().optional(),
    /** Key art / poster, path under public/, e.g. "/announcements/<slug>.png". */
    cover: z.string().optional(),
    /** Alt text for `cover`. Required whenever a cover is set — the poster carries
        the date and venue, so a screen reader that skips it loses real information. */
    coverAlt: z.string().optional(),
    coverAltUk: z.string().optional(),
    /** Slug of the `talks` entry this becomes once delivered. Set it when the archive
        entry lands so the home page can tell the two records apart as ONE appearance —
        matching on the event name does not work, because the archive usually spells it
        differently ("WAW TECH by DOU" vs "WAW TECH by DOU, Warsaw"). */
    talkSlug: z.string().optional(),
    /** Hide without deleting, e.g. an appearance that fell through. */
    draft: z.boolean().default(false),
  })
  // The poster carries the date and the venue, so a reader who cannot see it loses
  // real information — alt text is not optional decoration here.
  .refine((d) => !d.cover || (d.coverAlt !== undefined && d.coverAlt.trim().length > 0), {
    message: 'coverAlt is required whenever cover is set',
    path: ['coverAlt'],
  }),
});

export const collections = { posts, talks, labs, gallery, books, links, announcements };
