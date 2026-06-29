import { createApp } from './app';
import { createDb } from './db';
import { loadEnv } from './env';
import { createLogger } from './logger';

const env = loadEnv();
const logger = createLogger(env);

// Only connect when configured — the skeleton boots and serves /healthz with no
// database (Postgres is wired when the first feature needs it).
const db = env.DATABASE_URL ? createDb(env.DATABASE_URL).db : null;

const corsOrigins = env.WEB_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = createApp({
  logger,
  corsOrigins,
  hasDb: !!db,
  gemini: { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL },
});

logger.info({ event: 'server.boot', host: env.HOST, port: env.PORT, db: !!db });

export default {
  port: env.PORT,
  hostname: env.HOST,
  fetch: app.fetch,
};
