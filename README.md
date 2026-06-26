# yaroslavyermilov.io

Personal site of Yaroslav Yermilov — blog (EN + UA), lab, games, talks.

Stack: Astro 5 (SSR, Node adapter) · Hono on Bun API · TypeScript strict · MDX ·
React 19 islands · Tailwind v4 · Pagefind · Drizzle/Postgres · pnpm workspaces ·
Railway.

## Quick start

```sh
corepack enable                        # if pnpm isn't installed
pnpm install
pnpm dev                               # site → http://localhost:4321
pnpm --filter @yermilov/api dev        # API  → http://localhost:3001
```

## Layout

```
apps/web/          Astro site (SSR, Node adapter) + presentation-redirect middleware
apps/api/          Hono on Bun API skeleton (pino, /api/healthz, Drizzle/Postgres)
apps/game-*/       Tier-3 games, each with its own Vite build
packages/shared-*/ design tokens, eslint/tsconfig/prettier base
packages/db-schema, packages/api-types   shared backend schema + contracts
scripts/           build-games.ts
```

See `CLAUDE.md` for the full developer guide, the 3-tier interactivity rule, and
the repo-split / SSR-redirect architecture.

## Deploy

Hosted on **Railway** (auto-deploys on push to `main`), one service per app —
each configured by its `apps/<app>/railway.json` + `nixpacks.toml`:

- **web** — `pnpm build` (games → Astro SSR → Pagefind), served by the Astro Node
  standalone server (`node ./dist/server/entry.mjs`).
- **api** — `bun run src/index.ts`, healthcheck `/api/healthz`.
- **Postgres** — Railway add-on (wired when the first backend feature needs it).

The Railway setup/ops procedure lives in the `railway` skill. (This repo used to
deploy to GitHub Pages; that workflow was removed in the Railway migration.)

## Presentations & the old repo

The old [`yermilov/yermilov.github.io`](https://github.com/yermilov/yermilov.github.io)
repo is now a redirect stub that 302s here, and — with its custom domain detached —
natively hosts the talk decks at `yermilov.github.io/<name>`. This site
302-redirects `/<name>` for known presentations back there (see
`apps/web/src/config/presentations.ts`). The 2017 Grain/Octopress blog archive
lives in [`yermilov/old-blog`](https://github.com/yermilov/old-blog), linked from
the About page.
