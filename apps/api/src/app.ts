import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import type { Logger } from './logger';
import { logMiddleware } from './middleware/log';
import { healthRoutes } from './routes/health';
import type { AppBindings } from './types';

export type CreateAppArgs = {
  logger: Logger;
  // Browser origins allowed to call the API. Omitted in tests (no Origin header).
  corsOrigins?: string[];
  // Whether a database is wired (surfaced by /healthz). The skeleton has no
  // db-backed routes yet.
  hasDb?: boolean;
};

// Composition root for the Hono app. Built separately from index.ts so tests can
// construct it without booting a server. Add routers to `api` as features land.
export function createApp({ logger, corsOrigins = [], hasDb = false }: CreateAppArgs) {
  const app = new Hono<AppBindings>();

  app.use('*', logMiddleware(logger));
  app.use(
    '*',
    cors({
      origin: (origin) =>
        corsOrigins.includes(origin) ? origin : (corsOrigins[0] ?? ''),
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );

  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    c.var.logger?.error({ event: 'unhandled.error', err });
    return c.json({ error: 'internal server error' }, 500);
  });

  const api = new Hono<AppBindings>();
  api.route('/healthz', healthRoutes(hasDb));
  app.route('/api', api);

  return app;
}
