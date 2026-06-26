import { defineMiddleware } from 'astro:middleware';
import {
  PRESENTATION_SLUG_SET,
  PRESENTATIONS_HOST,
} from './config/presentations';

// Requirement (5): /<slug> for a known presentation 302-redirects to the
// github.io copy that still hosts it; every other path renders the site.
// Runs on every request (the site is built with the Node adapter), so it can
// intercept slugs that aren't routes in this app before they 404.
export const onRequest = defineMiddleware((context, next) => {
  const first = context.url.pathname.split('/').filter(Boolean)[0];
  if (first && PRESENTATION_SLUG_SET.has(first)) {
    return context.redirect(
      `${PRESENTATIONS_HOST}${context.url.pathname}${context.url.search}`,
      302,
    );
  }
  return next();
});
