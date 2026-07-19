import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@tailwindcss/vite';

// A `draft: true` lab is unlisted: its page is still built and reachable by direct link, but it
// stays out of the sitemap. The frontmatter is the single source of truth, so read it straight off
// disk — this config can't import `astro:content`. Both locales of a lab must be marked draft to
// keep it fully unlisted: `lab/[slug]` falls back to the other language when one is missing.
const unlistedLabUrls = (() => {
  const root = fileURLToPath(new URL('./src/content/labs', import.meta.url));
  const urls: string[] = [];
  for (const locale of readdirSync(root, { withFileTypes: true })) {
    if (!locale.isDirectory()) continue;
    for (const file of readdirSync(`${root}/${locale.name}`)) {
      if (!file.endsWith('.mdx')) continue;
      const frontmatter =
        readFileSync(`${root}/${locale.name}/${file}`, 'utf8').split('---')[1] ?? '';
      if (/^draft:\s*true\s*$/m.test(frontmatter)) {
        urls.push(`/${locale.name}/lab/${file.replace(/\.mdx$/, '')}/`);
      }
    }
  }
  return urls;
})();

// Old section landing pages → new IA. Detail URLs (/blog/<slug> etc.) are
// frozen forever and unaffected. Enumerated per locale because static builds
// can't expand `[locale]` params in redirect-only routes.
const sectionRedirects = Object.fromEntries(
  ['en', 'ua'].flatMap((l) => [
    [`/${l}/blog`, `/${l}/writing-talking/writing/`],
    [`/${l}/talks`, `/${l}/writing-talking/talking/`],
    [`/${l}/books`, `/${l}/inspiration/`],
    [`/${l}/gallery`, `/${l}/personal/`],
    [`/${l}/conference-kit`, `/${l}/writing-talking/kit/`],
    // check-network moved from the lab to the blog (2026-07-19) — keep the old lab URL alive.
    [`/${l}/lab/check-network`, `/${l}/blog/check-network/`],
  ]),
);

export default defineConfig({
  site: 'https://yaroslavyermilov.io',
  // Server runtime (Node adapter) so middleware runs per-request — it powers
  // the requirement-(5) presentation redirects. Content pages still build to
  // static HTML via `export const prerender = true` (see scripts/prerender),
  // so only unknown/redirect paths actually hit the server at runtime.
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'always',
  redirects: sectionRedirects,
  build: {
    format: 'directory',
  },
  i18n: {
    locales: ['en', 'ua'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    mdx(),
    react(),
    sitemap({
      filter: (page) => !unlistedLabUrls.some((url) => page.endsWith(url)),
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ua: 'uk' },
      },
    }),
  ],
  vite: {
    plugins: [tailwind()],
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },
});
