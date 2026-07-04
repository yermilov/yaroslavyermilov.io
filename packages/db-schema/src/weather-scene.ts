import { date, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Weather-lab cost control (B + E). Two tables back the /api/weather-scene
// endpoint so a sudden traffic spike can't run up unbounded Gemini image spend
// and so deploys/restarts don't wipe the cache into cold regeneration.

// L2 persistent scene cache: survives redeploys (the in-memory Map is L1). One
// row per cache key (rounded location + weather code + temp + day/night). The
// whole scene lives in `payload` (image data-URL + prompt + substitutions +
// generatedAt); `expires_at` mirrors the 3h in-memory TTL and expired rows are
// pruned opportunistically.
export const weatherSceneCache = pgTable('weather_scene_cache', {
  cacheKey: text('cache_key').primaryKey(),
  payload: jsonb('payload').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Daily generation counter for the hard budget kill-switch (B). One row per UTC
// day; a new day is a fresh row, so the budget auto-resets at 00:00 UTC. When
// today's count reaches WEATHER_SCENE_DAILY_BUDGET the endpoint stops generating
// (serves cache if present, else 429) until the next day.
export const weatherSceneDay = pgTable('weather_scene_day', {
  day: date('day').primaryKey(),
  count: integer('count').notNull().default(0),
});
