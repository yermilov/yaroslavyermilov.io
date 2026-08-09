export const prerender = true;
import type { APIRoute } from 'astro';
import {
  getAnnouncements,
  getPostsByLocale,
  getTalks,
  getLabsByLocale,
  getStampedBooks,
  postSlug,
  labSlug,
} from '@lib/content';

/**
 * /llms.txt — the machine-readable "front door" that agentic tools (Cursor, Claude
 * Code, Copilot, Perplexity fetchers) check first. Generated at build time from the
 * same content collections that drive the site, so it can never drift from what's
 * actually published. English map; the per-page bodies stay at their own URLs.
 */
export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL('https://yaroslavyermilov.io')).origin;
  const abs = (path: string) => `${origin}${path}`;

  const [posts, talks, labs, books, announcements] = await Promise.all([
    getPostsByLocale('en'),
    getTalks(),
    getLabsByLocale('en'),
    getStampedBooks('en'),
    /* Only the ones still ahead: this section answers "where can I see him next",
       so an event that already happened belongs under Talks, not here. */
    getAnnouncements(),
  ]);

  const lines: string[] = [
    '# Yaroslav Yermilov',
    '',
    '> Principal Software Engineer @ Superhuman (formerly Grammarly), based in Kyiv, Ukraine.',
    '> Writes and speaks on AI-first software engineering, developer productivity, and building',
    '> with LLM agents. Bilingual — English and Ukrainian. This site is his field journal:',
    '> posts, conference talks, interactive lab experiments, and an inspiration archive.',
    '',
    `Site: ${abs('/en/')} · Українською: ${abs('/ua/')}`,
    '',
    '## Writing',
    ...posts.map((p) => `- [${p.data.title}](${abs(`/en/blog/${postSlug(p)}/`)}) — ${p.data.summary}`),
    '',
    ...(announcements.length > 0
      ? [
          '## Upcoming',
          ...announcements.map(
            (a) =>
              `- [${a.data.title}](${abs(`/en/announcements/${a.slug}/`)}) — ${a.data.event}${a.data.location ? `, ${a.data.location}` : ''}`,
          ),
          '',
        ]
      : []),
    '## Talks',
    ...talks.map((tk) => `- [${tk.data.title}](${abs(`/en/talks/${tk.slug}/`)})`),
    '',
    '## Labs (interactive experiments)',
    ...labs.map((l) => `- [${l.data.title}](${abs(`/en/lab/${labSlug(l)}/`)})`),
    '',
    '## Inspiration (books read, newest first)',
    ...books.slice(0, 20).map((b) => `- ${b.data.title}${b.data.author ? ` — ${b.data.author}` : ''}`),
    `- Full archive: ${abs('/en/inspiration/')}`,
    '',
    '## Feeds & search',
    `- RSS (EN): ${abs('/en/rss.xml')}`,
    `- RSS (UA): ${abs('/ua/rss.xml')}`,
    `- Sitemap: ${abs('/sitemap-index.xml')}`,
    `- Media kit: ${abs('/en/writing-talking/kit/')}`,
    '',
    '## Contact',
    '- LinkedIn: https://www.linkedin.com/in/yarik-yermilov/',
    '- GitHub: https://github.com/yermilov',
    '- X: https://twitter.com/yermilov17',
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
