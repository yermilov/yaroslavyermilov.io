// Presentation decks that live in their own GitHub Pages repos and serve at
// https://yermilov.github.io/<slug>/. Requirement (5) of the migration: a
// request to https://yaroslavyermilov.io/<slug> for a KNOWN presentation
// 302-redirects to the github.io copy; any other path renders the site.
//
// Source of truth for the redirect set — adding a new talk = one line here.
// NOTE (cutover): reconcile this list against the repos that actually have
// GitHub Pages enabled under github.com/yermilov before the DNS cutover.
export const PRESENTATION_SLUGS = [
  'pragmatic-vibe-clauding-en',
  'pragmatic-vibe-clauding-ua',
  'ai-first-transformation-from-within-en',
  'ai-first-code-review-agent-ua',
  'how-to-make-your-team-ai-first-en',
  'revenge-of-the-skill-en',
  'dou-days-2026',
  'gpars-talk',
  'junit5-talk',
  'old-blog',
] as const;

export const PRESENTATION_SLUG_SET: ReadonlySet<string> = new Set(PRESENTATION_SLUGS);

export const PRESENTATIONS_HOST = 'https://yermilov.github.io';
