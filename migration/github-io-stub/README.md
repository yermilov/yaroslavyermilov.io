# yermilov.github.io redirect stub — cutover artifact

These two files (`index.html`, `404.html`) are what the **old `yermilov.github.io`
repo** becomes at cutover. They 302/meta-refresh every root request to
`https://yaroslavyermilov.io` (path-preserving). Staged here so they're reviewable
before the irreversible cutover; **do not apply until the Railway site is verified
live.**

## How they're applied (the IRREVERSIBLE cutover step — needs Yarik)

In the `yermilov/yermilov.github.io` repo:

1. Replace the repo's web content with these two files (the Astro `apps/` site is
   gone — it now lives in `yaroslavyermilov.io`).
2. **Delete `public/CNAME`** (or the repo's `CNAME`). This detaches the custom
   domain `yaroslavyermilov.io` from GitHub Pages — which (a) frees the domain to
   point at Railway, and (b) un-redirects `yermilov.github.io/*`, so the separate
   presentation-deck repos immediately serve natively at
   `yermilov.github.io/<name>` (requirement 4). The presentation repos are not
   touched.
3. Keep GitHub Pages **on** for the repo, source = the branch/Actions that serves
   these static files, but with **no custom domain**.

## Order matters (avoids a redirect loop / downtime)

1. Stand up Railway (web + api + Postgres) and verify the site on its
   `*.up.railway.app` URL.
2. **[confirm]** Detach the old CNAME (step 2 above) — only after the new site is
   verified.
3. **[confirm]** Point Cloudflare DNS for `yaroslavyermilov.io` (apex + `www`) at
   Railway (CNAME-flattened, DNS-only).
4. Push this stub to the `yermilov.github.io` repo.
5. Verify the four behaviours: `yaroslavyermilov.io` serves the site;
   `yermilov.github.io` 302s to it; `yermilov.github.io/<name>` serves a deck;
   `yaroslavyermilov.io/<name>` 302s to the deck.

## Before cutover — reconcile

- Confirm `apps/web/src/config/presentations.ts` matches the repos that actually
  have GitHub Pages enabled under `github.com/yermilov`.
- Carry over any content that landed in the live `yermilov.github.io` after this
  repo was cloned (e.g. the 17 UA book translations from 2026-06-26).
