import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@tailwindcss/vite';

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
  ]),
);

export default defineConfig({
  site: 'https://yaroslavyermilov.io',
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
