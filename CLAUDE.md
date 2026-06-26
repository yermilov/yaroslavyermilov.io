# yaroslavyermilov.io — agent guide

This file is loaded automatically into Claude Code's context. Read it before
making changes. The conventions here are deliberate; deviating from them
costs more than following them.

## What this repo is

A long-lived personal site (5+ year horizon) for Yaroslav Yermilov. Hosts
blog posts in EN + UA, embedded interactive demos, occasional canvas/WebGL
games, and a list of conference talks. Co-developed with Claude Code, so the
architecture intentionally favors the lowest-magic path.

## Stack

- **Astro 5 (SSR)** at `apps/web/` — Node adapter (`@astrojs/node`, standalone),
  `output: 'server'`. Content routes keep `export const prerender = true`, so pages
  still build to static HTML in `dist/client`; only unmatched paths hit the server
  at runtime (TypeScript strict, MDX, React 19 islands).
- **Hono on Bun** API at `apps/api/` — a ready-to-grow backend skeleton (pino
  logging, zod env, `/api/healthz`); Drizzle + Postgres wired, no feature endpoints yet.
- **Tailwind CSS v4** via `@tailwindcss/vite`; tokens live in CSS, not in a config file.
- **pnpm workspaces** — `apps/web`, `apps/api`, `apps/game-*`, `packages/shared-*`,
  `packages/db-schema`, `packages/api-types`.
- **Pagefind** static search built post-build (indexes `dist/client`).
- **Railway** deploy — `nixpacks.toml` + `railway.json` per service (web + api +
  Postgres), the pnpm-monorepo pattern from juggernaut (see the `railway` skill).
- Node 22+ (Bun for the API), pnpm 9.x.

## Architecture — repo split + SSR redirects

This repo (`yaroslavyermilov.io`) is the **personal site**, migrated off GitHub
Pages onto Railway so it can grow a backend. The old **`yermilov.github.io`** repo
is now a tiny **redirect stub** (its page 302s here) and, with its custom domain
detached, natively hosts the **presentation decks** at `yermilov.github.io/<name>`
(each its own Pages repo, untouched).

**Presentation redirects (requirement 5):** `apps/web/src/middleware.ts` runs on
every request (that's why the site is SSR) — a request to `/<slug>` for a known
presentation (`apps/web/src/config/presentations.ts`) **302-redirects to
`https://yermilov.github.io/<slug>`**; every other path renders the site. The 404
route is on-demand (`prerender = false`) so the middleware fires for slugs that
aren't routes here. Adding a talk = one line in `presentations.ts`.

## The 3-tier interactivity rule — load-bearing

```
Tier 1 — MDX island
  Calculators, tiny charts, inline visualizations, deterministic
  generative-art stills.
  React component imported into .mdx and rendered with
  <X client:visible /> (or client:load).
  Shares site Tailwind, typography, theme.
  No frame loop, no audio, no input capture, no fullscreen.

Tier 2 — Astro lab page
  Standalone medium visualizations (D3 dashboards, longer interactive
  demos).
  Lives at /{locale}/lab/<slug>, lazy-loaded React island, no iframe.
  Inherits theme-lab class so it can be louder than the reading surface.

Tier 3 — Iframe + separate Vite app
  Anything with a render loop, audio, input capture, fullscreen, or
  pointer lock — even if "tiny".
  Built as apps/game-<slug>/ with its own package.json and Vite build.
  Output served from /games/<slug>/index.html (sandboxed iframe).
  Astro wrapper at /{locale}/games/<slug> hosts an <iframe sandbox=…>.

Decision rule:
  has frame loop OR audio OR input handlers OR fullscreen OR pointer lock?
    yes → Tier 3, no exceptions.
  is it a standalone medium-sized visualization?
    yes → Tier 2.
  otherwise → Tier 1.
```

If unsure, default to Tier 3 — it's the least likely to cause site-wide
regressions.

## Path aliases

Always reference these instead of relative paths from outside `apps/web/src/`:

```
@components/*  apps/web/src/components/*
@layouts/*     apps/web/src/layouts/*
@content/*     apps/web/src/content/*
@lib/*         apps/web/src/lib/*
@styles/*      apps/web/src/styles/*
```

## URL convention — frozen

`/{locale}/{section}/{stable-slug}/` with trailing slash. Locales:
`en` (default), `ua`. (We use `ua` rather than the ISO 639-1 `uk`
because "UK" reads as United Kingdom to Ukrainian readers. The
`uk-UA` BCP 47 tag still lives behind `bcp47Locale()` for `<html lang>`,
hreflang, og:locale, and Intl APIs — see `apps/web/src/lib/i18n.ts`.)
Slugs are forever — never derive them from titles or dates.

## Site IA — the Field Journal sections

Top navigation has four sections, each a "volume" of one shared
timeline design (`@components/Timeline.astro` — spine, square nodes,
mono date stamps, serif year milestones):

- `/{locale}/writing-talking/` — posts + talks merged, with static
  sub-routes `writing/`, `talking/`, and `kit/` (the about-me kit)
- `/{locale}/inspiration/` — books now; schema-ready for podcasts/links
  later (extend the `TimelineEntry` union in `@lib/content.ts`)
- `/{locale}/personal/` — photo moments (standalone gallery entries +
  talk photos, grouped by day+caption)
- `/{locale}/workshop/` — workshop prospectus + LinkedIn DM CTA

Detail URLs are unchanged and frozen: `/blog/<slug>/`, `/talks/<slug>/`,
`/books/<slug>/`. Old landing pages (`/blog/`, `/talks/`, `/books/`,
`/gallery/`, `/conference-kit/`) are meta-refresh redirects enumerated
per locale in `astro.config.ts` — static builds can't expand `[locale]`
params in redirect-only routes, so they're listed explicitly.

## Social cards & favicon

Every page gets a build-time OG image from the static endpoint
`apps/web/src/pages/og/[card].png.ts` (satori + resvg, rendered in the
Field Journal identity via `@lib/og-card.ts`). New posts/talks/books get
cards automatically; pages pass `ogImage` down to `BaseLayout`. Satori
constraints worth knowing: Newsreader has no Cyrillic (UA titles use
PT Serif), only `.woff` static fonts work (no woff2/variable), and the
mono subsets lack dingbats/arrows — draw shapes with divs instead.

The favicon set (`favicon.svg`, `favicon-48.png`, `apple-touch-icon.png`
in `apps/web/public/`) is the «Є» mark, generated by
`node apps/web/scripts/build-favicons.ts` — re-run and commit outputs
only when the mark changes.

## Content schemas

Defined in `apps/web/src/content/config.ts`. Every post carries:

- `slug` (stable, forever)
- `canonicalSlug` (joins translations across languages)
- `language` (`en` | `ua`)
- `translations` (`{ en?: slug, ua?: slug }`) — explicit cross-language map

A post can exist in EN, UA, or both. Joining is by `canonicalSlug`, not by
file path. If only one language exists, the locale switcher disables the
other side and the missing-locale URL renders the original-language body
inside the requested-locale shell with a "Translation pending" banner.

## How to add a new blog post

```
apps/web/src/content/posts/{en|ua}/<stable-slug>.mdx
```

Frontmatter (minimal):

```yaml
---
title: "..."
slug: "stable-slug"
canonicalSlug: "stable-slug"   # same across translations
language: "en"                  # or "ua"
publishedAt: 2026-04-27
summary: "One sentence."
translations:
  en: "stable-slug"
  ua: "stable-slug-ua"          # only if a UA version exists
---
```

A Tier-1 island goes inline:

```mdx
import MyChart from "@components/post/MyChart.tsx";

<MyChart client:visible />
```

## How to add a new lab entry (Tier 2)

```
apps/web/src/content/labs/<slug>.mdx
```

Frontmatter must include `islandComponent` pointing to a path under
`apps/web/src/components/lab/`. The body MDX renders inside the
inverted-theme `LabLayout`.

## How to add a new game (Tier 3)

1. `mkdir apps/game-<slug>` and scaffold a Vite TS app there.
2. Game's `vite.config.ts` must set `base: '/games/<slug>/'` so its
   bundled asset URLs work when iframed under that path.
3. Game's `pnpm build` writes `apps/game-<slug>/dist/`.
4. Add a content entry at `apps/web/src/content/games/<slug>.mdx`
   with a frontmatter `slug` matching the directory name.
5. Push. The Railway build runs `scripts/build-games.ts` which copies each game's
   `dist/` into `apps/web/public/games/<slug>/`.

## Files NEVER edit by hand

- `apps/web/public/games/` — build artifact (from `apps/game-*`)
- `apps/web/public/pagefind/` — Pagefind index

Both are gitignored and rebuilt every build.

## Common commands

```
pnpm install                        # install all workspaces
pnpm dev                            # Astro dev server (apps/web)
pnpm build                          # full web build (games + Astro SSR + pagefind)
pnpm --filter web typecheck         # astro check
pnpm --filter @yermilov/api dev     # API dev (Bun --watch) on :3001
pnpm --filter @yermilov/api typecheck
pnpm tsx scripts/build-games.ts     # build apps/game-* into public/games/
```

Serve the built site locally the way Railway does:
`cd apps/web && node ./dist/server/entry.mjs`

## Analytics

Privacy-friendly analytics via [Plausible](https://plausible.io) (cookieless,
no consent banner needed). The tracking snippet lives in the `<head>` of
`apps/web/src/layouts/BaseLayout.astro`, so it covers every page.

- Gated behind `import.meta.env.PROD` — dev/preview traffic is never counted.
- Uses the modern `pa-<id>.js` script with outbound links, file downloads,
  and form submissions tracking bundled in.
- Dashboard: https://plausible.io/yaroslavyermilov.io (account-gated).

To track a **custom event**, call `plausible('EventName')` from any client
script or island; the `window.plausible` queue is initialized by the snippet.
To change which optional measurements are on, re-copy the snippet from the
Plausible site settings — the `pa-<id>.js` URL bundles that config server-side.

## Gotchas

- **Tailwind v4**: configuration is CSS, not JS. Tokens are in
  `apps/web/src/styles/tokens.css` (extends `@yermilov/shared-tokens`).
  Do NOT create a `tailwind.config.ts`.
- **React islands** must opt in to hydration with `client:*` directives.
  Default is server-only render.
- **i18n routes**: `prefixDefaultLocale: true`, so root `/` is a 308 redirect
  to `/en/`. Never link to a path without a locale prefix.
- **Trailing slashes**: enforced via `trailingSlash: 'always'` in
  `astro.config.ts`. Pagefind and the SSR 404 handler depend on this.
- **Drafts**: `draft: true` posts are rendered in dev but skipped in prod.
  Don't rely on this for sensitive material.
