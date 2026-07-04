import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import type { Database } from './db';
import type { Logger } from './logger';
import { logMiddleware } from './middleware/log';
import { healthRoutes } from './routes/health';
import { weatherSceneRoutes } from './routes/weather-scene';
import type { AppBindings } from './types';

export type CreateAppArgs = {
  logger: Logger;
  // Browser origins allowed to call the API. Omitted in tests (no Origin header).
  corsOrigins?: string[];
  // The Drizzle database, or null when DATABASE_URL is unset (local dev / tests).
  // Passed to routes that persist state; null degrades them to in-memory-only.
  db?: Database | null;
  gemini?: {
    apiKey?: string;
    model: string;
  };
  // Hard daily cap on weather-scene generations (cost control B). Default here
  // mirrors the env default so tests and callers that omit it still get a cap.
  weatherSceneDailyBudget?: number;
};

// Composition root for the Hono app. Built separately from index.ts so tests can
// construct it without booting a server. Add routers to `api` as features land.
export function createApp({
  logger,
  corsOrigins = [],
  db = null,
  gemini,
  weatherSceneDailyBudget = 200,
}: CreateAppArgs) {
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
  api.route('/healthz', healthRoutes(!!db));
  api.route(
    '/weather-scene',
    weatherSceneRoutes({
      apiKey: gemini?.apiKey,
      model: gemini?.model ?? 'gemini-2.5-flash-image-preview',
      allowedOrigins: corsOrigins,
      db,
      dailyBudget: weatherSceneDailyBudget,
    }),
  );
  app.route('/api', api);

  return app;
}
